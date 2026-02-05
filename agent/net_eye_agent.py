#!/usr/bin/env python3
import os
import socket
import time
import platform
import json
import threading
import subprocess
import re
import requests
import yaml
from dataclasses import dataclass, asdict, field
from typing import List, Optional
from pathlib import Path


@dataclass
class Config:
    backend_url: str = "http://localhost:3001"
    agent_secret: str = "change_this_secret_in_production"
    scan_interval_seconds: int = 60
    heartbeat_interval_seconds: int = 30
    subnet: str = "auto"  # "auto" or manual like "192.168.1.0/24"
    common_ports: List[int] = field(default_factory=lambda: [22, 80, 443, 3389, 8080])
    port_scan_timeout: float = 0.5

    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """Load config from YAML file"""
        if not os.path.exists(path):
            print(f"[!] Config file {path} not found, using defaults")
            return cls()
        
        with open(path, 'r') as f:
            data = yaml.safe_load(f) or {}
        
        return cls(
            backend_url=data.get('backend_url', cls.backend_url),
            agent_secret=data.get('agent_secret', cls.agent_secret),
            scan_interval_seconds=data.get('scan_interval_seconds', cls.scan_interval_seconds),
            heartbeat_interval_seconds=data.get('heartbeat_interval_seconds', cls.heartbeat_interval_seconds),
            subnet=data.get('subnet', cls.subnet),
            common_ports=data.get('common_ports', cls.common_ports),
            port_scan_timeout=data.get('port_scan_timeout', cls.port_scan_timeout),
        )


@dataclass
class PortScanResult:
    port_number: int
    protocol: str = "tcp"
    state: str = "closed"
    service_name: Optional[str] = None
    service_version: Optional[str] = None


@dataclass
class DeviceScanResult:
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    manufacturer: Optional[str] = None
    device_type: Optional[str] = None
    os_detection: Optional[str] = None
    ports: Optional[List[PortScanResult]] = None


class NetEyeAgent:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.backend_url = config.backend_url.rstrip("/")
        self.agent_id: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({"x-agent-secret": config.agent_secret})

    def get_hostname(self) -> str:
        return socket.gethostname()

    def get_primary_ip(self) -> str:
        """Get primary IP by connecting to external host"""
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = "127.0.0.1"
        finally:
            s.close()
        return ip

    def get_os_type(self) -> str:
        """Detect OS type"""
        return platform.system()

    def register(self) -> None:
        """Register agent with backend"""
        hostname = self.get_hostname()
        ip_address = self.get_primary_ip()
        os_type = self.get_os_type()

        payload = {
            "hostname": hostname,
            "ip_address": ip_address,
            "os_type": os_type,
        }

        print(f"[*] Registering agent {hostname} ({ip_address}) [{os_type}]...")
        try:
            resp = self.session.post(f"{self.backend_url}/api/agent/register", json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            self.agent_id = data.get("agent_id")
            print(f"[+] Agent registered with id: {self.agent_id}")
        except Exception as e:
            print(f"[!] Registration failed: {e}")
            raise

    def heartbeat_loop(self) -> None:
        """Send periodic heartbeat to backend"""
        while True:
            try:
                if self.agent_id:
                    self.session.post(
                        f"{self.backend_url}/api/agent/heartbeat",
                        json={"agent_id": self.agent_id},
                        timeout=5,
                    )
            except Exception as e:
                print(f"[!] Heartbeat error: {e}")
            time.sleep(self.config.heartbeat_interval_seconds)

    def get_mac_address(self, ip: str) -> Optional[str]:
        """Try to get MAC address via ARP"""
        try:
            # Try arp command (Linux/Mac)
            result = subprocess.run(['arp', '-n', ip], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                # Parse output for MAC address
                match = re.search(r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})', result.stdout)
                if match:
                    return match.group(0).upper()
        except Exception:
            pass
        return None

    def tcp_port_is_open(self, ip: str, port: int) -> bool:
        """Check if TCP port is open"""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.config.port_scan_timeout)
        try:
            s.connect((ip, port))
            return True
        except Exception:
            return False
        finally:
            s.close()

    def get_service_name(self, port: int) -> Optional[str]:
        """Get common service name for port"""
        services = {
            22: 'SSH',
            80: 'HTTP',
            443: 'HTTPS',
            3389: 'RDP',
            8080: 'HTTP-Alt',
            21: 'FTP',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            110: 'POP3',
            143: 'IMAP',
            3306: 'MySQL',
            5432: 'PostgreSQL',
            6379: 'Redis',
            27017: 'MongoDB'
        }
        return services.get(port)

    def scan_host(self, ip: str) -> Optional[DeviceScanResult]:
        """Scan a single host"""
        # Hostname resolution
        hostname = None
        try:
            hostname = socket.gethostbyaddr(ip)[0]
        except Exception:
            pass

        # Port scan
        open_ports: List[PortScanResult] = []
        for port in self.config.common_ports:
            if self.tcp_port_is_open(ip, port):
                service_name = self.get_service_name(port)
                open_ports.append(
                    PortScanResult(
                        port_number=port,
                        state="open",
                        service_name=service_name
                    )
                )

        # Skip if no open ports
        if not open_ports:
            return None

        # Get MAC address
        mac_address = self.get_mac_address(ip)

        return DeviceScanResult(
            ip_address=ip,
            mac_address=mac_address,
            hostname=hostname,
            ports=open_ports,
        )

    def get_subnet_to_scan(self) -> str:
        """Determine which subnet to scan"""
        if self.config.subnet != "auto":
            return self.config.subnet
        
        # Auto-detect from primary IP
        base_ip = self.get_primary_ip()
        octets = base_ip.split(".")
        if len(octets) == 4:
            return f"{'.'.join(octets[:3])}.0/24"
        return "192.168.1.0/24"

    def scan_network(self) -> List[DeviceScanResult]:
        """Scan network for devices"""
        subnet = self.get_subnet_to_scan()
        print(f"[*] Starting network scan on {subnet}...")
        
        # Parse subnet (simple /24 only for now)
        if "/24" in subnet:
            prefix = subnet.split("/")[0].rsplit(".", 1)[0]
            hosts_to_scan = [f"{prefix}.{i}" for i in range(1, 255)]
        else:
            print(f"[!] Only /24 subnets supported for now")
            return []

        results: List[DeviceScanResult] = []
        total = len(hosts_to_scan)

        for idx, ip in enumerate(hosts_to_scan, 1):
            if idx % 50 == 0:
                print(f"[*] Progress: {idx}/{total} hosts scanned...")
            
            try:
                res = self.scan_host(ip)
                if res:
                    print(f"[+] Host up: {ip} (MAC: {res.mac_address or 'N/A'}) - {len(res.ports or [])} open ports")
                    results.append(res)
            except KeyboardInterrupt:
                raise
            except Exception as e:
                pass  # Silent failure for individual hosts

        print(f"[+] Scan complete: {len(results)} devices found")
        return results

    def submit_scan(self, devices: List[DeviceScanResult]) -> None:
        """Submit scan results to backend"""
        if not self.agent_id:
            raise RuntimeError("Agent not registered")

        payload = {
            "agent_id": self.agent_id,
            "devices": [self._device_to_dict(d) for d in devices],
        }

        try:
            resp = self.session.post(f"{self.backend_url}/api/agent/scan", json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            print(f"[+] Scan submitted, devices_processed={data.get('devices_processed')}")
        except Exception as e:
            print(f"[!] Failed to submit scan: {e}")

    def _device_to_dict(self, device: DeviceScanResult) -> dict:
        """Convert device to dict for JSON serialization"""
        d = asdict(device)
        if d.get("ports") is None:
            d["ports"] = []
        return d

    def scan_loop(self) -> None:
        """Main scan loop"""
        while True:
            try:
                devices = self.scan_network()
                if devices:
                    self.submit_scan(devices)
                else:
                    print("[*] No devices discovered in this round")
            except Exception as e:
                print(f"[!] Scan loop error: {e}")

            print(f"[*] Waiting {self.config.scan_interval_seconds}s until next scan...")
            time.sleep(self.config.scan_interval_seconds)


def main() -> None:
    print("="*60)
    print("Net_Eye Agent v2.0")
    print("="*60)
    
    # Load config
    config_path = os.getenv('NETEYE_CONFIG', 'config.yaml')
    config = Config.from_yaml(config_path)
    
    print(f"[*] Backend URL: {config.backend_url}")
    print(f"[*] Scan interval: {config.scan_interval_seconds}s")
    print(f"[*] Target subnet: {config.subnet}")
    print()
    
    agent = NetEyeAgent(config)
    
    try:
        agent.register()
    except Exception as e:
        print(f"[!] Failed to register agent: {e}")
        print("[!] Make sure backend is running and credentials are correct")
        return

    # Start heartbeat thread
    hb_thread = threading.Thread(target=agent.heartbeat_loop, daemon=True)
    hb_thread.start()
    print("[+] Heartbeat thread started")

    # Main thread = scan loop
    print("[+] Starting scan loop...\n")
    agent.scan_loop()


if __name__ == "__main__":
    main()
