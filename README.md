AKSW Travel Reimbursement Tool
===



## 1. Preamble
The following files are part of the web service 'AKSW Travel Reimburstement'

* Live Development Version (Alpha): 
https://script.google.com/macros/s/AKfycbwyY0qTZMg8ETrFz18QqAXEKFJ0hw11-w1CabUJi3Tk/dev

* Snapshot Version (Beta): 
https://script.google.com/macros/s/AKfycbyp7TdoDHTX7XGtjxp9BgaOP7KeBe3xJr-FhT_glxoP7WI1pYsw/exec


## 2. Project overview
The project consists of two web service components:

#### Google Apps Script Component
This is the main service hosted in the Google Cloud.  
Files Overview:
* `FormProcessing.gs` - Controller (communication between Model and View)
* `Form.html` - View
* `BackendLogic.gs` - Model
* `Macros.gs` - the user defined macros for complex business calculations are stored within this file

#### Java Servlet Proxy
This (internal) helper service just fetches the university reimbursement pdf files by listening for a post request with a reimbursement XML file and returning the generated pdf file from the university webservice. Therefore it uses the browser simulation framework HtmlUnit [1].

Files Overview:
* `ReimbursementProxyServlet.war` - pre-compiled Web application Archive
* `ReimbursementProxyServlet.java` - source code 

## 3. How it works
tba

## 4. (Re-)Deployment
This information is just relevant to admins.

### Requirements
* Java Servlet 2.5 compatible Web Container with JRE 1.7. (or higher) running on a server inside the university network

### Installation & Configuration
1. Install the `ReimbursementProxyServlet.war` on your Web Container
2. Change the coressponding URL variable in `BackendLogic.gs` in to the newly installed Service

## 5. License
Copyright 2015 AKSW

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

		

## 6. Appendix: 
### VPN setup 
to use the university travel reimbursement form [2] for generating a xml file from outside the university network

#### On Ubuntu:
1. sudo apt-get install network-manager-openconnect
2. (optional for GNOME) sudo apt-get install  network-manager-openconnect network-manager-openconnect-gnome
2. open the "Network Connections" Manager GUI

	OPTION: A

	3. Click on "VPN" -> "Add" -> Choose "Cisco Any Connect Compatible VPN (openconnect)" -> "Create"
	4. Set vpn.uni-leipzig.de  as "VPN Gateway"
	5. Connect -> enter your credentials from Uni Leipzig or ask Sebastian for credentials if you're external

	OPTION: B

	3. Click on "VPN" -> "Import" -> Select the provided configuration file "UniLeipzigVPNConfig"
	4. Connect -> enter your credentials from Uni Leipzig or ask Sebastian for credentials if you're external

NOTE: if you want to use the cisco client (e.g. if you don't have apt-get or aptitude) have a look at
https://www.urz.uni-leipzig.de/hilfe/anleitungen-a-z/vpn/vpn-zugang-unter-linux/

## 7. References

[1] http://htmlunit.sourceforge.net/   
[2] https://service.uni-leipzig.de/pvz/dienstreiseantrag/create




