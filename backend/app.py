from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import threading
import sqlite3
import json
import uuid
import os
import re
import subprocess
import xml.etree.ElementTree as ET
import logging
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = 'raw_results'
REPORT_DIR = 'reports'
for path in (RAW_DIR, REPORT_DIR):
    os.makedirs(path, exist_ok=True)

SCAN_TYPE_MAP = {
    'quick': '-T4 -F -sV',
    'full': '-p- -A -sV',
    'aggressive': '-A -T4 -sV',
    'vulnerability': '-sV --script vuln',
    'service_detection': '-sV -A',
    'os_detection': '-O -sV',
    'basic': '-sV'
}

# Database initialization
def init_db():
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scans
                 (id TEXT PRIMARY KEY, target TEXT, scan_type TEXT, status TEXT,
                  start_time TEXT, end_time TEXT, results TEXT, raw_output_path TEXT, report_path TEXT)''')
    conn.commit()
    c.execute('PRAGMA table_info(scans)')
    columns = [row[1] for row in c.fetchall()]
    if 'raw_output_path' not in columns:
        c.execute('ALTER TABLE scans ADD COLUMN raw_output_path TEXT')
    if 'report_path' not in columns:
        c.execute('ALTER TABLE scans ADD COLUMN report_path TEXT')
    conn.commit()
    conn.close()

init_db()

def normalize_targets(target_input):
    if isinstance(target_input, list):
        targets = target_input
    elif isinstance(target_input, str):
        targets = [t.strip() for t in re.split(r'[\n,;]+', target_input) if t.strip()]
    else:
        targets = []
    return targets


def build_scan_args(scan_type):
    return SCAN_TYPE_MAP.get(scan_type, SCAN_TYPE_MAP['basic'])


class NmapScanner:
    def __init__(self, scan_id, targets, scan_type='basic'):
        self.scan_id = scan_id
        self.targets = targets
        self.scan_type = scan_type
        self.raw_output_path = os.path.join(RAW_DIR, f'{scan_id}.nmap')
        self.report_path = os.path.join(REPORT_DIR, f'{scan_id}.pdf')
        self.progress = 5

    def run_scan(self):
        try:
            target_label = ', '.join(self.targets)
            socketio.emit('scan_progress', {
                'scan_id': self.scan_id,
                'status': 'scanning',
                'message': f'Starting {self.scan_type} scan on {target_label}...',
                'progress': self.progress
            })

            xml_output = self._run_nmap()
            results = self._parse_results(xml_output)
            results['scan_type'] = self.scan_type
            results['targets'] = self.targets
            results['risk_level'] = self._calculate_risk(results)
            results['chart_data'] = self._build_chart_data(results)

            report_path = self._generate_pdf_report(results)
            self.report_path = report_path

            self._save_to_db(results)

            socketio.emit('scan_complete', {
                'scan_id': self.scan_id,
                'status': 'completed',
                'results': results
            })
            logger.info(f"Scan {self.scan_id} completed successfully")
        except Exception as e:
            logger.error(f"Scan error: {str(e)}")
            socketio.emit('scan_error', {
                'scan_id': self.scan_id,
                'error': str(e)
            })

    def _run_nmap(self):
        scan_args = build_scan_args(self.scan_type)
        cmd = ['nmap', *scan_args.split(), '-oX', '-', '-oN', self.raw_output_path, *self.targets]
        logger.info(f"Running nmap: {' '.join(cmd)}")

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stderr_thread = threading.Thread(target=self._stream_stderr, args=(proc.stderr,))
        stderr_thread.daemon = True
        stderr_thread.start()

        xml_output = proc.stdout.read()
        proc.wait()
        stderr_thread.join(timeout=1)

        if proc.returncode != 0 and not xml_output:
            raise RuntimeError('Nmap failed to produce XML output. Check Nmap installation and target accessibility.')

        return xml_output

    def _stream_stderr(self, stream):
        for line in stream:
            message = line.strip()
            if not message:
                continue
            self._emit_log(message)

    def _emit_log(self, message):
        self.progress = self._estimate_progress(message)
        socketio.emit('scan_log', {
            'scan_id': self.scan_id,
            'message': message
        })
        socketio.emit('scan_progress', {
            'scan_id': self.scan_id,
            'status': 'scanning',
            'message': message,
            'progress': self.progress
        })

    def _estimate_progress(self, message):
        normalized = message.lower()
        if 'nmap done' in normalized:
            return 100
        if 'initiating' in normalized or 'starting' in normalized:
            return max(self.progress, 10)
        if 'scan report' in normalized or 'completed' in normalized:
            return max(self.progress, 90)
        return min(self.progress + 5, 95)

    def _parse_results(self, xml_output):
        root = ET.fromstring(xml_output)
        results = {
            'hosts': [],
            'total_hosts': 0,
            'scan_info': {},
            'vulnerabilities': []
        }

        hosts = root.findall('host')
        results['total_hosts'] = len(hosts)

        for host in hosts:
            address = host.find('address')
            status = host.find('status')
            host_address = address.attrib.get('addr') if address is not None else 'unknown'
            host_status = status.attrib.get('state') if status is not None else 'unknown'

            host_info = {
                'host': host_address,
                'status': host_status,
                'ports': []
            }

            ports = host.find('ports')
            if ports is not None:
                for port in ports.findall('port'):
                    port_id = int(port.attrib.get('portid', 0))
                    protocol = port.attrib.get('protocol', '')
                    state = port.find('state')
                    service = port.find('service')
                    scripts = port.findall('script')

                    port_state = state.attrib.get('state', 'filtered') if state is not None else 'filtered'
                    service_info = {
                        'name': service.attrib.get('name', 'Unknown') if service is not None else 'Unknown',
                        'product': service.attrib.get('product', 'Unknown') if service is not None else 'Unknown',
                        'version': service.attrib.get('version', 'Unknown') if service is not None else 'Unknown',
                        'extrainfo': service.attrib.get('extrainfo', '') if service is not None else ''
                    }

                    script_output = []
                    for script in scripts:
                        script_id = script.attrib.get('id', '')
                        output = script.attrib.get('output', '')
                        if output:
                            script_output.append({'id': script_id, 'output': output})
                            if self.scan_type == 'vulnerability' or 'vuln' in script_id.lower():
                                results['vulnerabilities'].append({'port': port_id, 'id': script_id, 'output': output})

                    port_info = {
                        'port': port_id,
                        'protocol': protocol,
                        'state': port_state,
                        'name': service_info['name'],
                        'product': service_info['product'],
                        'version': service_info['version'],
                        'extrainfo': service_info['extrainfo'],
                        'scripts': script_output
                    }
                    host_info['ports'].append(port_info)

            os_element = host.find('os')
            if os_element is not None:
                os_matches = [match.attrib.get('name', 'Unknown') for match in os_element.findall('osmatch')]
                if os_matches:
                    host_info['os'] = os_matches

            results['hosts'].append(host_info)

        scan_info = root.find('scaninfo')
        if scan_info is not None:
            results['scan_info'] = scan_info.attrib

        return results

    def _calculate_risk(self, results):
        open_ports = 0
        vuln_count = len(results.get('vulnerabilities', []))
        for host in results['hosts']:
            for port in host['ports']:
                if port['state'] == 'open':
                    open_ports += 1

        if vuln_count > 0 or open_ports >= 15:
            return 'High'
        if open_ports >= 6:
            return 'Medium'
        if open_ports > 0:
            return 'Low'
        return 'None'

    def _build_chart_data(self, results):
        open_count = 0
        filtered_count = 0
        closed_count = 0
        port_distribution = {}

        for host in results['hosts']:
            for port in host['ports']:
                state = port['state']
                if state == 'open':
                    open_count += 1
                elif state == 'closed':
                    closed_count += 1
                else:
                    filtered_count += 1

                port_number = str(port['port'])
                port_distribution[port_number] = port_distribution.get(port_number, 0) + 1

        top_ports = sorted(port_distribution.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'status_counts': {
                'open': open_count,
                'closed': closed_count,
                'filtered': filtered_count
            },
            'top_ports': [{'port': int(port), 'count': count} for port, count in top_ports]
        }

    def _generate_pdf_report(self, results):
        report_path = self.report_path
        pdf = canvas.Canvas(report_path, pagesize=letter)
        width, height = letter
        pdf.setFont('Helvetica-Bold', 18)
        pdf.drawString(40, height - 50, 'Nmap Scan Report')
        pdf.setFont('Helvetica', 11)
        pdf.drawString(40, height - 80, f'Scan ID: {self.scan_id}')
        pdf.drawString(40, height - 100, f'Targets: {", ".join(results["targets"])}')
        pdf.drawString(40, height - 120, f'Scan type: {results["scan_type"]}')
        pdf.drawString(40, height - 140, f'Total hosts: {results["total_hosts"]}')
        pdf.drawString(40, height - 160, f'Risk level: {results["risk_level"]}')

        y = height - 190
        pdf.setFont('Helvetica-Bold', 13)
        pdf.drawString(40, y, 'Open / Closed / Filtered Counts')
        y -= 20
        pdf.setFont('Helvetica', 11)
        counts = results['chart_data']['status_counts']
        for key in ('open', 'closed', 'filtered'):
            pdf.drawString(40, y, f'{key.title()}: {counts.get(key, 0)}')
            y -= 16

        y -= 10
        pdf.setFont('Helvetica-Bold', 13)
        pdf.drawString(40, y, 'Top Ports')
        y -= 20
        pdf.setFont('Helvetica', 11)
        for port_info in results['chart_data']['top_ports']:
            if y < 80:
                pdf.showPage()
                y = height - 80
            pdf.drawString(40, y, f'Port {port_info["port"]}: {port_info["count"]} occurrences')
            y -= 16

        y -= 20
        if y < 150:
            pdf.showPage()
            y = height - 80

        pdf.setFont('Helvetica-Bold', 13)
        pdf.drawString(40, y, 'Detailed Hosts and Ports')
        y -= 20
        pdf.setFont('Helvetica', 10)
        for host in results['hosts']:
            if y < 80:
                pdf.showPage()
                y = height - 80
            pdf.drawString(40, y, f'Host: {host["host"]} ({host["status"]})')
            y -= 14
            for port in host['ports']:
                if y < 60:
                    pdf.showPage()
                    y = height - 80
                pdf.drawString(60, y, f'{port["port"]}/{port["protocol"]} {port["state"]} {port["name"]} {port["product"]} {port["version"]}')
                y -= 12
            y -= 10

        pdf.save()
        return report_path

    def _save_to_db(self, results):
        conn = sqlite3.connect('scans.db')
        c = conn.cursor()
        c.execute('''INSERT OR REPLACE INTO scans
                     (id, target, scan_type, status, start_time, end_time, results, raw_output_path, report_path)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (self.scan_id, ', '.join(self.targets), self.scan_type, 'completed',
                   datetime.now().isoformat(), datetime.now().isoformat(),
                   json.dumps(results), self.raw_output_path, self.report_path))
        conn.commit()
        conn.close()

# Routes
@app.route('/')
def home():
    return jsonify({'message': 'Nmap backend running', 'status': 'healthy'})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    data = request.json or {}
    targets = normalize_targets(data.get('targets') or data.get('target'))
    scan_type = data.get('scan_type', 'basic')

    if not targets:
        return jsonify({'error': 'At least one target is required'}), 400

    scan_id = str(uuid.uuid4())
    scanner = NmapScanner(scan_id, targets, scan_type)
    thread = threading.Thread(target=scanner.run_scan)
    thread.start()

    return jsonify({'scan_id': scan_id, 'status': 'started', 'targets': targets})


@app.route('/api/scan/history', methods=['GET'])
def get_scan_history():
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('SELECT id, target, scan_type, status, start_time, end_time FROM scans ORDER BY start_time DESC')
    scans = c.fetchall()
    conn.close()
    
    history = [
        {
            'id': scan[0],
            'target': scan[1],
            'scan_type': scan[2],
            'status': scan[3],
            'start_time': scan[4],
            'end_time': scan[5]
        }
        for scan in scans
    ]
    
    return jsonify(history)

@app.route('/api/scan/results/<scan_id>', methods=['GET'])
def get_scan_results(scan_id):
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('SELECT results FROM scans WHERE id = ?', (scan_id,))
    result = c.fetchone()
    conn.close()

    if not result:
        return jsonify({'error': 'Scan not found'}), 404

    return jsonify(json.loads(result[0]))


@app.route('/api/scan/raw/<scan_id>', methods=['GET'])
def get_raw_output(scan_id):
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('SELECT raw_output_path FROM scans WHERE id = ?', (scan_id,))
    result = c.fetchone()
    conn.close()

    if not result or not result[0] or not os.path.isfile(result[0]):
        return jsonify({'error': 'Raw output not found'}), 404

    return send_file(result[0], mimetype='text/plain', as_attachment=True, download_name=f'{scan_id}.nmap')


@app.route('/api/scan/report/<scan_id>', methods=['GET'])
def get_report(scan_id):
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('SELECT report_path, results FROM scans WHERE id = ?', (scan_id,))
    result = c.fetchone()
    conn.close()

    if not result:
        return jsonify({'error': 'Report not found'}), 404

    report_path, results_json = result
    if not report_path or not os.path.isfile(report_path):
        results = json.loads(results_json)
        scanner = NmapScanner(scan_id, normalize_targets(results.get('targets') or []), results.get('scan_type', 'basic'))
        report_path = scanner._generate_pdf_report(results)

    return send_file(report_path, mimetype='application/pdf', as_attachment=True, download_name=f'{scan_id}.pdf')


@app.route('/api/scan/delete/<scan_id>', methods=['DELETE'])
def delete_scan(scan_id):
    conn = sqlite3.connect('scans.db')
    c = conn.cursor()
    c.execute('SELECT raw_output_path, report_path FROM scans WHERE id = ?', (scan_id,))
    record = c.fetchone()
    c.execute('DELETE FROM scans WHERE id = ?', (scan_id,))
    conn.commit()
    conn.close()

    if record:
        for path in record:
            if path and os.path.isfile(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

    return jsonify({'status': 'deleted'})

# SocketIO events
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connect', {'data': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
