# reimbursement


## VPN setup

On Ubuntu:
1. sudo apt-get install network-manager-openconnect
2. open the "Network Connections" Manager GUI
OPTION: A
3. Click on "VPN" -> "Add" -> Choose "Cisco Any Connect Compatible VPN (openconnect)" -> "Create"
4. Set vpn.uni-leipzig.de  as "VPN Gateway"
5. Connect -> enter your credentials from Uni Leipzig or ask Sebastian for credentials if you're external

OPTION: B
3. Click on "VPN" -> "Import" -> Select the provided configuration file "UniLeipzigVPNConfig"
4. Connect -> enter your credentials from Uni Leipzig or ask Sebastian for credentials if you're external

------
NOTE: if you want to use the cisco client (e.g. if you don't have apt-get or aptitude) have a look at
https://www.urz.uni-leipzig.de/hilfe/anleitungen-a-z/vpn/vpn-zugang-unter-linux/

