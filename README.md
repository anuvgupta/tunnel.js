# tunnel.js

Seamless automation of multiple SSH tunnels via SOCKS proxy settings.  
Efficient, cost-effective, secure "poor man's" alternative to a personal VPN.  
Intended for macOS use.  

### configuration

1. First, edit the script `tunnel` (not `tunnel.js`), setting `script_path` to the absolute path on your disk to the `tunnel.js` script (ie. `script_path=/Users/anuv/Documents/GitHub/tunnel.js/tunnel.js`).
2. Then, symlink (with absolute paths) the `tunnel` script to `/usr/local/bin` like so (sudo may be required): `ln -s /Users/anuv/Documents/GitHub/tunnel.js/tunnel /usr/local/bin`
3. Finally, populate `configs.json` with configurations for each tunnel required:

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
        "reverse_port": 22333,
        "local_port": 16262,
        "pid": null
    },
    "another_config": { ... }
}

```

-   `ssh_config` is the name of the SSH configuration that refers to the SSH-enabled server you will use as a proxy
    -   SSH configurations on macOS are usually created and stored in the file `~/.ssh/config`
-   `local_port` is any unreserved/free port on your local macOS device
    -   For example, if you set `local_port`=8888, then your tunnel will be locally accessible at localhost:8888
    -   Proxies can then be manually (or automatically, in this script) configured to localhost:8888
-   `net_service` (optional) is the name of the network service you are currently using
    -   In System Preferences -> Network on macOS, each item in the left pane (ie. Wi-Fi, Bluetooth PAN, Ethernet, etc.) is a network service
    -   Populate this field in config.json with the name of the network service you are currently using (usually "Wi-Fi"), exactly as it is in System Preferences -> Network
    -   If specified, the script will automate the config's tunnel proxies upon this particular network service
-   `reverse_port` (optional) is any unreserved/free port on both your local macOS device and your remote server
    -   If specified, port-forwards connections to remote_server:reverse_port back to local_macos:reverse_port
    -   Useful for peer-to-peer connections (ie. torrent)

### usage

-   For each config, a tunnel can be opened via `tunnel config_name open` (and closed `tunnel config_name close`)
-   Logs of each tunnel process will be stored in `logs/config_name.log`, but can be tailed using `tunnel config_name tail`
-   If a tunnel process dies by itself, the config status/PID will not be updated, so `tunnel config_name clean` must be called
-   Once a tunnel is opened, use `tunnel config_name enable system` to enable the macOS system SOCKS proxy for the configured network service to the newly opened tunnel
    -   Now a different config can be enabled over this one, or this one can be disabled via `tunnel config_name disable system`
    -   Each network service can only have one SOCKS proxy enabled for it at a time
-   Alternatively, in each terminal/shell opened, call `source tunnel config_name enable shell` to configure the http/https proxies (as well as other untested proxies ie. ftp, telnet)
    -   Now a different config can be enabled over this one, or this one can be disabled via `source tunnel config_name disable shell`
    -   The `source` command must be used here, as the proxy is enabled by modifying shell environment variables
    -   To enable the tunnel for all shells opened, put that same command `source tunnel config_name enable shell` in your shell profile (ie. `.bash_profile`, `.zprofile`)
        -   Not recommended if multiple tunnels are used simultaneously, in parallel, or in succession
-   The script does not automate enabling the SOCKS proxy for torrent clients, but it can be done manually
    -   For example, if `reverse_port`=22333 (and `local_port`=16262), then in a torrent client, set the "port used for incoming connections" to `22333`
    -   Then, enable (for all peer-to-peer connections and torrent downloads) a SOCKS5 proxy to `localhost:16262`
-   Do not use the `tunnel.js` script directly; always use the `tunnel` shell script or its symlink, or `source tunnel`



&nbsp;  
*2020*
