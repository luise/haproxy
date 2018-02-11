const { Container, allowTraffic } = require('kelda');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const image = 'haproxy:1.7';
const configPath = '/usr/local/etc/haproxy/haproxy.cfg';

// The port HAProxy uses to communicate with the containers behind it.
const internalPort = 80;

// The port HAProxy listens on.
const exposedPort = 80;

/**
 * Returns a map from the HAProxy config path to the combined frontend and
 * backend configs.
 * @param {string} frontendConfig
 * @param {string} backendConfig
 * @return {Object.<string, string>}
 */
function createConfigFiles(frontendConfig, backendConfig) {
  const configTempl = fs.readFileSync(
    path.join(__dirname, 'haproxy.cfg'), { encoding: 'utf8' });

  let config = Mustache.render(configTempl, { port: exposedPort });
  config += `
${frontendConfig}

${backendConfig}
`;

  const files = {};
  files[configPath] = config;

  return files;
}

/**
 * Returns an HAProxy container containing the given files.
 * @param {Container[]} containers The containers to put behind the proxy.
 * @param {Object.<string, string>} files A map from filenames to file
 * contents, describing the files to put in each of the proxy containers.
 * @return {Container} The new HAProxy container.
 */
function createHapContainer(containers, files) {
  const haproxy = new Container({
    name: 'haproxy',
    image,
    command: ['-f', configPath],
    filepathToContent: files,
  });

  allowTraffic(haproxy, containers, internalPort);

  return haproxy;
}


/**
 * Returns rules for choosing a backend based on the Host header in an incoming
 * HTTP request.
 * @param {string} domain The domain name for which the given backend should handle
 * traffic.
 * @param {string} backendName The backend that should receive traffic for the domain.
 * This is a HAProxy identifier for within the config file. It should be match
 * a backend created with `createBackendConfig`.
 * @return {string}
 */
function urlRoutingConfig(domain, backendName) {
  return `    acl ${backendName}_req hdr(host) -i ${domain}
    use_backend ${backendName} if ${backendName}_req`;
}


/**
 * Returns backend rules to load balance over the given containers, using sticky
 * sessions.
 * @param {string} name An identifier for the created backend config. Other
 * parts of the config that reference this backend should do so using this
 * name.
 * @param {Container[]} containers The containers that traffic should be load
 * balanced over.
 * @param {string} balance The load balancing algorithm to use. See HAProxy's
 * docs for possible algorithms.
 * @return {string}
 */
function createBackendConfig(name, containers, balance) {
  // The SERVERID session cookie ensures that a given user's requests are always
  // forwarded to the same backend server.
  let config = `backend ${name}
    balance ${balance}
    cookie SERVERID insert indirect nocache`;

  containers.forEach((c) => {
    const addr = c.getHostname();
    config += `
    server ${addr} ${addr}:${internalPort} check resolvers dns cookie ${addr}`;
  });

  return config;
}


/**
 * Creates a replicated HAProxy service that load balances over a group of
 * containers, using sticky sessions. This load balancer does not take into
 * account the Host header of the request -- all requests will be balanced
 * across the same set of containers. Domain-based routing is available with
 * `withURLrouting`.
 * @param {Container[]} containers The containers whose traffic should be load balanced.
 * @param {string} balance The load balancing algorithm to use. See HAProxy's
 * docs for possible algorithms.
 * @return {Container} The HAProxy container.
 */
function simpleLoadBalancer(containers, balance = 'roundrobin') {
  const frontendConfig = '    default_backend default';
  const backendConfig = createBackendConfig('default', containers, balance);
  const files = createConfigFiles(frontendConfig, backendConfig);

  return createHapContainer(containers, files);
}


/**
 * Creates a HAProxy container that does load balanced, URL based
 * routing with sticky sessions.
 * @param {Object.<string, Container[]>} domainToContainers A map from domain name to
 * the containers that should receive traffic for that domain.
 * @param {string} balance The load balancing algorithm to use. See HAProxy's
 * docs for possible algorithms.
 * @return {Container} The HAProxy container.
 */
function withURLrouting(domainToContainers, balance = 'roundrobin') {
  const domains = Object.keys(domainToContainers);
  const frontendConfig = domains.map(
    domain => urlRoutingConfig(domain, domain))
    .join('\n\n');
  const backendConfig = domains.map(
    domain => createBackendConfig(domain, domainToContainers[domain], balance))
    .join('\n\n');
  const files = createConfigFiles(frontendConfig, backendConfig);

  const allContainers = domains.map(domain => domainToContainers[domain])
    .reduce((a, b) => a.concat(b), []);
  return createHapContainer(allContainers, files);
}


module.exports = { exposedPort, simpleLoadBalancer, withURLrouting };
