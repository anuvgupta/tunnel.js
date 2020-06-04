const fs = require('fs');
const { exec, spawn } = require('child_process');

var arguments = process.argv.slice(2);

var configs = {
    data: {},
    save: (next = null) => {
        var db_json = JSON.stringify(configs.data, null, 3);
        fs.writeFile(`${__dirname}/configs.json`, db_json, function (e) {
            if (e) {
                console.log('error: saving configs', e);
            } else {
                console.log('saved configs');
                if (next) next();
            }
        });
    },
    save_sync: _ => {
        var db_json = JSON.stringify(configs.data, null, 3);
        fs.writeFileSync(`${__dirname}/configs.json`, db_json);
        console.log('saved configs');
    },
    load: (next = null) => {
        try {
            fs.readFile(`${__dirname}/configs.json`, function (err, data) {
                try {
                    if (err) throw err;
                    data = JSON.parse(data);
                    configs.data = data;
                    if (next) next();
                } catch (e) {
                    console.log('error: reading configs', e);
                }
            });
        } catch (e) {
            console.log('error: reading configs', e);
        }
    }
};

var app = {
    tail: log_path => {
        var tail = spawn('tail', ['-f', log_path]);
        tail.stdout.on('data', data => {
            console.log(data.toString());
        });
        tail.stderr.on('data', data => {
            console.error('error: ' + data.toString());
        });
        tail.on('exit', code => {
            console.log(`log exited (code ${code.toString()}`);
        });
    },
    main: _ => {
        if (arguments.length > 0 && arguments.length < 3) {
            if (arguments[0] == 'help') {
                console.log('tunnel.js\nusage: tunnel config_name on/off\n       node tunnel.js config_name on/off');
            } else if (arguments.length == 1) {
                console.error('error: invalid argument');
            } else if (arguments.length == 2) {
                if (!(['on', 'off'].includes(arguments[1]))) {
                    console.error('error: second argument should be "on" or "off"');
                } else {
                    var config_name = arguments[0];
                    var change_status = arguments[1] == 'on' ? 1 : 0;
                    configs.load(_ => {
                        if (configs.data.hasOwnProperty(config_name) && configs.data[config_name]) {
                            var config = configs.data[config_name];
                            if (change_status) {
                                if (config.pid === null) {
                                    exec(`networksetup -setsocksfirewallproxy ${config.net_service} localhost ${config.local_port}`, (err, stdout, stderr) => {
                                        if (err) {
                                            console.error('error: updating proxy settings', err)
                                        } else if (stderr && stderr.trim() != "") {
                                            console.error('error: updating proxy settings', stderr)
                                        } else {
                                            console.log('updated proxy settings');
                                            exec(`networksetup -setsocksfirewallproxystate ${config.net_service} on`, (err2, stdout2, stderr2) => {
                                                if (err2) {
                                                    console.error('error: enabling proxy', err2)
                                                } else if (stderr2 && stderr2.trim() != "") {
                                                    console.error('error: enabling proxy', stderr2)
                                                } else {
                                                    console.log("enabled proxy");
                                                    exec(`nohup ssh -2 -NAT -D ${config.local_port} ${config.ssh_config} > ${__dirname}/logs/${config_name}.log 2>&1 & echo $!`, (err3, stdout3, stderr3) => {
                                                        if (err3) {
                                                            console.error('error: establishing tunnel', err3)
                                                        } else if (stderr3 && stderr3.trim() != "") {
                                                            console.error('error: establishing tunnel', stderr3)
                                                        } else {
                                                            var pid = parseInt(stdout3);
                                                            configs.data[config_name].pid = pid;
                                                            console.log(`established tunnel (pid: ${pid})`);
                                                            configs.save(_ => {
                                                                console.log('note: terminating this script will not close the tunnel');
                                                                console.log('tunnel log: ');
                                                                app.tail(`${__dirname}/logs/${config_name}.log`);
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                } else console.error(`error: turn ${config_name} off first`);
                            } else {
                                if (config.pid === null)
                                    console.error(`error: turn ${config_name} on first`);
                                else {
                                    exec(`networksetup -setsocksfirewallproxystate ${config.net_service} off`, (err, stdout, stderr) => {
                                        if (err) {
                                            console.error('error: disabling proxy', err)
                                        } else if (stderr && stderr.trim() != "") {
                                            console.error('error: disabling proxy', stderr)
                                        } else {
                                            console.log("disabled proxy");
                                            exec(`kill -9 ${config.pid}`, (err2, stdout2, stderr2) => {
                                                if (err2) {
                                                    console.error('error: closing tunnel', err2)
                                                } else if (stderr2 && stderr2.trim() != "") {
                                                    console.error('error: closing tunnel', stderr2)
                                                } else {
                                                    console.log('closed tunnel');
                                                    configs.data[config_name].pid = null;
                                                    configs.save();
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        } else console.error('error: invalid configuration');
                    });
                }
            }
        } else console.error('error: incorrect # of arguments');
    }
};

app.main();