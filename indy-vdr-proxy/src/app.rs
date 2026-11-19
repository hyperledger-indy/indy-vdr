extern crate clap;
use clap::{Arg, ArgAction, Command};

#[derive(Debug)]
pub struct Config {
    pub genesis: Option<String>,
    pub namespace: String,
    #[cfg(unix)]
    pub socket: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub init_refresh: bool,
    pub interval_refresh: u32,
    pub is_multiple: bool,
    pub tls_cert_path: Option<String>,
    pub tls_key_path: Option<String>,
    pub cache: bool,
    pub cache_size: usize,
    pub cache_path: Option<String>,
}

pub fn load_config() -> Result<Config, String> {
    let matches = build_command().get_matches();
    parse_config(matches)
}

fn build_command() -> Command {
    const VERSION: &str = env!("CARGO_PKG_VERSION");

    #[allow(unused_mut)]
    let mut app = Command::new("indy-vdr-proxy")
        .version(VERSION)
        .about("Proxy requests to a Hyperledger Indy-Node ledger")
        .arg(
            Arg::new("genesis")
                .short('g')
                .long("genesis")
                .value_name("GENESIS")
                .help("Path to the ledger genesis transactions")
        )
        .arg(
            Arg::new("name")
                .short('n')
                .long("name")
                .value_name("NAMESPACE")
                .help("Namespace of ledger for DID resolution. Only needed if not multiple-ledgers")
        )
        .arg(
            Arg::new("multiple-ledgers")
                .action(ArgAction::SetTrue)
                .help("Support multiple ledgers")
                .long("multiple-ledgers")
        )
        .arg(
            Arg::new("host")
                .short('h')
                .long("host")
                .value_name("HOST")
                .default_value("0.0.0.0")
                .help("Set the local address to listen on")
        )
        .arg(
            Arg::new("port")
                .short('p')
                .long("port")
                .value_name("PORT")
                .help("Sets the local port to listen on")
        )
        .arg(
            Arg::new("no-refresh")
                .long("no-refresh")
                .action(ArgAction::SetTrue)
                .help("Disable initial validator node refresh")
        )
        .arg(
            Arg::new("refresh-interval")
                .short('r')
                .long("refresh-interval")
                .value_name("INTERVAL")
                .help("Set the interval in minutes between validator node refresh attempts (0 to disable refresh, default 120)"),
        )
        .arg(
            Arg::new("tls-cert")
                .long("tls-cert")
                .value_name("CERT")
                .help("Path to the TLS certificate file")
        )
        .arg(
            Arg::new("tls-key")
                .long("tls-key")
                .value_name("KEY")
                .help("Path to the TLS private key file")
        ).arg(
            Arg::new("use-cache")
                .long("use-cache").action(ArgAction::SetTrue)
                .value_name("CACHE")
                .help("Whether to use cache or not")
        ).arg(
            Arg::new("cache-size")
                .long("cache-size")
                .value_name("CACHE_SIZE")
                .help("Size of cache")
        ).arg(
            Arg::new("cache-path")
                .long("cache-path")
                .value_name("CACHE_PATH")
                .help("Path to cache")
        );

    #[cfg(unix)]
    {
        app = app.arg(
            Arg::new("socket")
                .short('s')
                .long("socket")
                .value_name("SOCKET")
                .help("Sets the UNIX socket path listen on"),
        );
    }

    app = app.disable_help_flag(true).arg(
        Arg::new("help")
            .short('?')
            .long("help")
            .help("Display command line parameters")
            .action(ArgAction::Help),
    );

    app
}

fn parse_config(matches: clap::ArgMatches) -> Result<Config, String> {
    let genesis = matches.get_one::<String>("genesis").cloned();

    let namespace = matches
        .get_one::<String>("name")
        .cloned()
        .unwrap_or_else(|| "test".to_string());

    let is_multiple = matches.get_flag("multiple-ledgers");

    if matches.contains_id("socket") {
        if matches.contains_id("host") {
            return Err("Cannot specify both host and socket".to_owned());
        }
    } else if !matches.contains_id("port") {
        return Err("Port number or socket must be specified".to_owned());
    }

    #[cfg(unix)]
    let socket = matches.get_one::<String>("socket").cloned();

    let host = matches.get_one::<String>("host").cloned();
    let port = if let Some(port) = matches.get_one::<String>("port") {
        Some(port.parse::<u16>().map_err(|_| "Invalid port number")?)
    } else {
        None
    };
    let init_refresh = !matches.get_flag("no-refresh");
    let interval_refresh = matches
        .get_one::<String>("refresh-interval")
        .map(|ival| ival.parse::<u32>().map_err(|_| "Invalid refresh interval"))
        .transpose()?
        .unwrap_or(120);

    let tls_cert_path = matches.get_one::<String>("tls-cert").cloned();
    let tls_key_path = matches.get_one::<String>("tls-key").cloned();
    let cache = matches.get_flag("use-cache");
    let cache_size = matches
        .get_one::<String>("cache-size")
        .map(|ival| ival.parse::<usize>().map_err(|_| "Invalid cache size"))
        .transpose()?
        .unwrap_or(1000);
    let cache_path = matches.get_one::<String>("cache-path").cloned();

    Ok(Config {
        genesis,
        namespace,
        #[cfg(unix)]
        socket,
        host,
        port,
        init_refresh,
        interval_refresh,
        is_multiple,
        tls_cert_path,
        tls_key_path,
        cache,
        cache_size,
        cache_path,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> Result<Config, String> {
        let matches = build_command()
            .try_get_matches_from(args)
            .map_err(|e| e.to_string())?;
        parse_config(matches)
    }

    #[test]
    fn parses_minimal_port_config() {
        let config = parse(&["indy-vdr-proxy", "--port", "8080"]).unwrap();
        assert_eq!(config.port, Some(8080));
        assert_eq!(config.host.as_deref(), Some("0.0.0.0"));
        assert_eq!(config.namespace, "test");
        assert!(!config.is_multiple);
        assert!(config.init_refresh);
        assert_eq!(config.interval_refresh, 120);
        assert!(!config.cache);
        assert_eq!(config.cache_size, 1000);
    }

    #[test]
    fn requires_port_or_socket() {
        let err = parse(&["indy-vdr-proxy"]).unwrap_err();
        assert_eq!(err, "Port number or socket must be specified");
    }

    #[test]
    fn rejects_invalid_port() {
        let err = parse(&["indy-vdr-proxy", "--port", "not-a-port"]).unwrap_err();
        assert_eq!(err, "Invalid port number");
    }

    #[test]
    fn rejects_invalid_refresh_interval() {
        let err = parse(&[
            "indy-vdr-proxy",
            "--port",
            "8080",
            "--refresh-interval",
            "oops",
        ])
        .unwrap_err();
        assert_eq!(err, "Invalid refresh interval");
    }

    #[test]
    fn no_refresh_flag_disables_init_refresh() {
        let config = parse(&["indy-vdr-proxy", "--port", "8080", "--no-refresh"]).unwrap();
        assert!(!config.init_refresh);
    }

    #[test]
    fn parses_cache_options() {
        let config = parse(&[
            "indy-vdr-proxy",
            "--port",
            "8080",
            "--use-cache",
            "--cache-size",
            "42",
            "--cache-path",
            "/tmp/cache",
        ])
        .unwrap();
        assert!(config.cache);
        assert_eq!(config.cache_size, 42);
        assert_eq!(config.cache_path.as_deref(), Some("/tmp/cache"));
    }

    #[test]
    fn multiple_ledgers_flag_is_parsed() {
        let config = parse(&["indy-vdr-proxy", "--port", "8080", "--multiple-ledgers"]).unwrap();
        assert!(config.is_multiple);
    }

    #[test]
    #[cfg(unix)]
    fn socket_and_default_host_are_mutually_exclusive() {
        let err = parse(&[
            "indy-vdr-proxy",
            "--socket",
            "/tmp/indy-vdr-proxy-test.sock",
        ])
        .unwrap_err();
        assert_eq!(err, "Cannot specify both host and socket");
    }

    #[test]
    fn version_flag_is_recognized() {
        let err = build_command()
            .try_get_matches_from(["indy-vdr-proxy", "--version"])
            .unwrap_err();
        assert_eq!(err.kind(), clap::error::ErrorKind::DisplayVersion);
    }

    #[test]
    fn help_flag_is_recognized() {
        let err = build_command()
            .try_get_matches_from(["indy-vdr-proxy", "--help"])
            .unwrap_err();
        assert_eq!(err.kind(), clap::error::ErrorKind::DisplayHelp);
    }
}
