#!/usr/bin/env python3
"""
Net_Eye Agent - Network Scanner
Scans local network and reports to backend
"""

import json
import time
import socket
import platform
import requests
import netifaces
import nmap
import psutil
from datetime import datetime
from typing import List, Dict, Optional
import logging
import sys
import os

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('NetEyeAgent')


class NetEyeAgent:
    def __init__(self, config_path: str = 'config.json'):
        """Initialize the agent with configuration"""
        self.config = self.load_config(config_path)
        self.agent_id: Optional[str] = None
        self.hostname = socket.gethostname()
        self.local_ip = self.get_local_ip()
        self.os_type = platform.system()
        self.scanner = nmap.PortScanner()
        
        logger.info(f"Agent initialized: {self.hostname} ({self.local_ip})")
    
    def load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Config file not found: {config_path}")
            logger.info("Creating default config from example...")
            if os.path.exists('config.json.example'):
                with open('config.json.example', 'r') as f:
                    config = json.load(f)
                with open(config_path, 'w') as f:
                    json.dump(config, f, indent=2)
                logger.info("Please edit config.json with your settings")
                sys.exit(1)
            else:
                logger.error("No example config found. Cannot proceed.")
                sys.exit(1)
    
    def get_local_ip(self) -> str:
        """Get the local IP address"""
        try:
            # Try to get the default gateway interface
            gws = netifaces.gateways()
            if 'default' in gws and netifaces.AF_INET in gws['default']:
                interface = gws['default'][netifaces.AF_INET][1]
                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    return addrs[netifaces.AF_INET][0]['addr']
        except Exception as e:
            logger.warning(f"Could not determine local IP via netifaces: {e}")
        
        # Fallback method
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception as e:
            logger.error(f"Could not determine local IP: {e}")
            return '127.0.0.1'
    
    def get_network_range(self) -> str:
        """Calculate network range from local IP"""
        ip_parts = self.local_ip.split('.')
        return f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.0/24"
    
    def register(self) -> bool:
        """Register this agent with the backend"""
        try:
            url = f"{self.config['backend_url']}/api/agent/register"
            headers = {
                'Content-Type': 'application/json',
                'X-Agent-Secret': self.config['agent_secret']
            }
            data = {
                'hostname': self.hostname,
                'ip_address': self.local_ip,
                'os_type': self.os_type
            }
            
            logger.info(f"Registering with backend: {url}")
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.agent_id = result['agent_id']
                logger.info(f"Successfully registered with ID: {self.agent_id}")
                return True
            else:
                logger.error(f"Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return False
    
    def scan_network(self) -> List[Dict]:
        """Scan the local network for devices"""
        devices = []
        network_range = self.get_network_range()
        
        logger.info(f"Starting network scan: {network_range}")
        
        try:
            # Perform ping scan to discover hosts
            self.scanner.scan(hosts=network_range, arguments='-sn -T4')
            
            for host in self.scanner.all_hosts():
                if self.scanner[host].state() == 'up':
                    device = {
                        'ip_address': host,
                        'mac_address': None,
                        'hostname': None,
                        'manufacturer': None,
                        'device_type': 'unknown',
                        'os_detection': None,
                        'ports': []
                    }
                    
                    # Get MAC address and vendor
                    if 'mac' in self.scanner[host]['addresses']:
                        device['mac_address'] = self.scanner[host]['addresses']['mac']
                        if 'vendor' in self.scanner[host] and self.scanner[host]['vendor']:
                            vendor_dict = self.scanner[host]['vendor']
                            if device['mac_address'] in vendor_dict:
                                device['manufacturer'] = vendor_dict[device['mac_address']]
                    
                    # Try to get hostname
                    try:
                        hostname = socket.gethostbyaddr(host)[0]
                        device['hostname'] = hostname
                    except:
                        pass
                    
                    # Perform port scan if enabled
                    if self.config.get('scan_types', {}).get('port_scan', False):
                        device['ports'] = self.scan_ports(host)
                    
                    devices.append(device)
                    logger.info(f"Found device: {host} ({device.get('hostname', 'unknown')})")
            
            logger.info(f"Network scan complete. Found {len(devices)} devices")
            
        except Exception as e:
            logger.error(f"Network scan error: {e}")
        
        return devices
    
    def scan_ports(self, host: str) -> List[Dict]:
        """Scan common ports on a host"""
        ports = []
        port_range = self.config.get('port_scan_range', [22, 80, 443])
        port_args = ','.join(map(str, port_range))
        
        try:
            # Perform TCP SYN scan on specified ports
            scan_args = f'-p {port_args} -sV --version-intensity 0' if self.config.get('scan_types', {}).get('service_detection', False) else f'-p {port_args} -sS'
            self.scanner.scan(host, arguments=scan_args)
            
            if host in self.scanner.all_hosts():
                for proto in self.scanner[host].all_protocols():
                    ports_dict = self.scanner[host][proto]
                    for port_num in ports_dict:
                        port_info = ports_dict[port_num]
                        ports.append({
                            'port_number': port_num,
                            'protocol': proto,
                            'state': port_info['state'],
                            'service_name': port_info.get('name', ''),
                            'service_version': port_info.get('version', '')
                        })
        
        except Exception as e:
            logger.warning(f"Port scan error for {host}: {e}")
        
        return ports
    
    def submit_scan(self, devices: List[Dict]) -> bool:
        """Submit scan results to backend"""
        if not self.agent_id:
            logger.error("Cannot submit scan: agent not registered")
            return False
        
        try:
            url = f"{self.config['backend_url']}/api/agent/scan"
            headers = {
                'Content-Type': 'application/json',
                'X-Agent-Secret': self.config['agent_secret']
            }
            data = {
                'agent_id': self.agent_id,
                'devices': devices
            }
            
            logger.info(f"Submitting scan data: {len(devices)} devices")
            response = requests.post(url, json=data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                logger.info("Scan data submitted successfully")
                return True
            else:
                logger.error(f"Submit scan failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Submit scan error: {e}")
            return False
    
    def send_heartbeat(self) -> bool:
        """Send heartbeat to backend"""
        if not self.agent_id:
            return False
        
        try:
            url = f"{self.config['backend_url']}/api/agent/heartbeat"
            headers = {
                'Content-Type': 'application/json',
                'X-Agent-Secret': self.config['agent_secret']
            }
            data = {'agent_id': self.agent_id}
            
            response = requests.post(url, json=data, headers=headers, timeout=5)
            return response.status_code == 200
            
        except Exception as e:
            logger.warning(f"Heartbeat error: {e}")
            return False
    
    def run(self):
        """Main agent loop"""
        logger.info("=" * 60)
        logger.info("Net_Eye Agent Starting")
        logger.info(f"Hostname: {self.hostname}")
        logger.info(f"IP: {self.local_ip}")
        logger.info(f"OS: {self.os_type}")
        logger.info(f"Backend: {self.config['backend_url']}")
        logger.info("=" * 60)
        
        # Register with backend
        if not self.register():
            logger.error("Failed to register. Exiting.")
            sys.exit(1)
        
        scan_interval = self.config.get('scan_interval', 300)
        heartbeat_interval = 60
        last_scan = 0
        last_heartbeat = 0
        
        logger.info(f"Agent running. Scan interval: {scan_interval}s")
        
        try:
            while True:
                current_time = time.time()
                
                # Perform scan
                if current_time - last_scan >= scan_interval:
                    devices = self.scan_network()
                    if devices:
                        self.submit_scan(devices)
                    last_scan = current_time
                
                # Send heartbeat
                if current_time - last_heartbeat >= heartbeat_interval:
                    self.send_heartbeat()
                    last_heartbeat = current_time
                
                time.sleep(10)  # Check every 10 seconds
                
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
        except Exception as e:
            logger.error(f"Agent error: {e}")
            raise


if __name__ == '__main__':
    # Check if running as root/admin (required for some scans)
    if os.geteuid() != 0 if hasattr(os, 'geteuid') else False:
        logger.warning("Agent not running as root. Some scan features may be limited.")
    
    agent = NetEyeAgent()
    agent.run()
