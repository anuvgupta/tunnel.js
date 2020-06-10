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
    tail_logs: (config, config_name, callback = null) => {
        console.log('tailing tunnel log: ');
        var tail = spawn('tail', ['-f', `${__dirname}/logs/${config_name}.log`]);
        tail.stdout.on('data', data => {
            console.log(data.toString());
        });
        tail.stderr.on('data', data => {
            console.error('error: ' + data.toString());
        });
        tail.on('exit', code => {
            console.log(`log exited (code ${code.toString()}`);
            if (callback) callback();
        });
    },
    establish_tunnel: (config, config_name, callback = null) => {
        console.log('establishing tunnel');
        if (config.pid === null) {
            var reverse_proxy = config.hasOwnProperty("reverse_port") && config.reverse_port ? `-R ${config.reverse_port}:localhost:${config.reverse_port}` : '';
            exec(`nohup ssh -2 -NAT ${reverse_proxy} -D ${config.local_port} ${config.ssh_config} > ${__dirname}/logs/${config_name}.log 2>&1 & echo $!`, (err, stdout, stderr) => {
                if (err) {
                    console.error('error: establishing tunnel', err);
                } else if (stderr && stderr.trim() != "") {
                    console.error('error: establishing tunnel', stderr);
                } else {
                    var pid = parseInt(stdout);
                    configs.data[config_name].pid = pid;
                    console.log(`established tunnel`);
                    configs.save(_ => {
                        console.log(`pid ${pid} saved`);
                        if (callback) callback();
                    });
                }
            });
        } else console.error('error: destroy/clean existing tunnel first');
    },
    destroy_tunnel: (config, config_name, callback = null) => {
        console.log('destroying tunnel');
        if (config.pid === null) console.error('error: establish a tunnel first');
        else {
            exec(`kill -9 ${config.pid}`, (err, stdout, stderr) => {
                if (err) {
                    console.error('error: destroying tunnel', err)
                } else if (stderr && stderr.trim() != "") {
                    console.error('error: destroying tunnel', stderr)
                } else {
                    console.log('destroyed tunnel');
                    var old_pid = config.pid;
                    configs.data[config_name].pid = null;
                    configs.save(_ => {
                        console.log(`removed pid ${old_pid}`);
                        if (callback) callback();
                    });
                }
            });
        }
    },
    clean_tunnel: (config, config_name, callback = null) => {
        console.log('cleaning tunnel');
        if (config.pid === null) console.error('error: establish a tunnel first');
        else {
            configs.data[config_name].pid = null;
            configs.save(_ => {
                console.log(`removed pid ${config.pid}`);
                console.log('cleaned tunnel');
                if (callback) callback();
            });
        }
    },
    enable_system_proxy: (config, config_name, callback = null) => {
        exec(`networksetup -setsocksfirewallproxy ${config.net_service} localhost ${config.local_port}`, (err, stdout, stderr) => {
            if (err) {
                console.error('error: updating system proxy settings', err)
            } else if (stderr && stderr.trim() != "") {
                console.error('error: updating system proxy settings', stderr)
            } else {
                console.log('updated system proxy settings');
                exec(`networksetup -setsocksfirewallproxystate ${config.net_service} on`, (err2, stdout2, stderr2) => {
                    if (err2) {
                        console.error('error: enabling system proxy', err2)
                    } else if (stderr2 && stderr2.trim() != "") {
                        console.error('error: enabling system proxy', stderr2)
                    } else {
                        console.log("enabled system proxy");
                        if (callback) callback();
                    }
                });
            }
        });
    },
    disable_system_proxy: (config, config_name, callback = null) => {
        exec(`networksetup -setsocksfirewallproxystate ${config.net_service} off`, (err, stdout, stderr) => {
            if (err) {
                console.error('error: disabling system proxy', err)
            } else if (stderr && stderr.trim() != "") {
                console.error('error: disabling system proxy', stderr)
            } else {
                console.log("disabled system proxy");
                if (callback) callback();
            }
        });
    },
    enable_shell_proxy: (config, config_name, callback = null) => {
        console.log(`socks5://localhost:${config.local_port}/`);
        if (callback) callback();
    },
    disable_shell_proxy: (config, config_name, callback = null) => {
        console.log(`socks5:disable`);
        if (callback) callback();
    },
    main: _ => {
        if (arguments[0] == 'help') {
            console.log(`tunnel.js usage:\n` +
                `   tunnel $config_name open/close/clean/tail\n` +
                `   tunnel $config_name enable/disable system\n` +
                `   source tunnel $config_name enable/disable shell\n` +
                `(do not use tunnel.js directly)`
            );
        } else if (arguments.length < 2) {
            console.error('error: more arguments needed');
        } else {
            var config_name = arguments[0];
            configs.load(_ => {
                if (configs.data.hasOwnProperty(config_name) && configs.data[config_name]) {
                    var config = configs.data[config_name];
                    if (arguments[1] == 'open') {
                        app.establish_tunnel(config, config_name);
                    } else if (arguments[1] == 'close') {
                        app.destroy_tunnel(config, config_name);
                    } else if (arguments[1] == 'clean') {
                        app.clean_tunnel(config, config_name);
                    } else if (arguments[1] == 'tail') {
                        app.tail_logs(config, config_name);
                    } else if (arguments[1] == 'enable' || arguments[1] == 'disable') {
                        var enable = arguments[1] == 'enable' ? true : false;
                        if (arguments.length < 3) {
                            console.error('error: more arguments needed');
                        } else {
                            if (arguments[2] == 'system') {
                                if (enable) app.enable_system_proxy(config, config_name);
                                else app.disable_system_proxy(config, config_name);
                            } else if (arguments[2] == 'shell') {
                                if (enable) app.enable_shell_proxy(config, config_name);
                                else app.disable_shell_proxy(config, config_name);
                            } else {
                                console.error(`error: invalid target ${arguments[2]} (use shell/system)`);
                            }
                        }
                    } else {
                        console.error(`error: invalid action ${arguments[1]} (use open/close/clean/tail/enable/disable)`);
                    }
                } else console.error(`error: invalid configuration ${arguments[0]}`);
            });
        }
    }
};

app.main();