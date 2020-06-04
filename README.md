# tunnel

Automated seamless switching between multiple SSH tunnels via SOCKS proxy settings.  
 Intended for macOS use.

### configuration

Populate `config.json` with configurations for each tunnel required:

```
{
    "lightsail": {
        "net_service": "Wi-Fi",
        "ssh_config": "lightsail",
        "local_port": 16261,
        "pid": null
    },
    "second_config": {
        "net_service": "Wi-Fi",
        "ssh_config": "ssh_config_name",
        "local_port": 16262,
        "pid": null
    },
    "third_config": { ... }
}

```

-   `net_service` is the name of the network service you are currently using
    -   In System Preferences -> Network, each item in the left pane (ie. Wi-Fi, Bluetooth PAN, Ethernet, etc.) is a network service
    -   Populate this field in config.json with the name of the network service you are currently using (usually "Wi-Fi"), exactly as it is in System Preferences -> Network
-   `ssh_config` is the name of the SSH configuration that refers to the SSH-enabled server you will use as a proxy
    -   SSH configurations on macOS are usually created and stored in the file `~/.ssh/config`
-   `local_port` is any unreserved/free port on your local macOS device
    -   For example, if you set`local_port`=8888, then your tunnel will be locally accessible at localhost:8888
    -   Proxies can then be manually (or automatically, in this script) configured to localhost:8888

### usage

Each network service can only have one SOCKS proxy enabled for it at a time.
So for each network service, ensure to turn off the tunnel on that service before opening a new one on the same service.
Either the node.js script or the executable can be used as such:  
`tunnel lightsail on`  
`node tunnel.js lightsail off`  
`node tunnel.js second_config on`  
`tunnel second_config off`  
