const kelda = require('kelda');
const haproxy = require('../haproxy');

const indexPath = '/usr/share/nginx/html/index.html';

/** Create a number of webservers serving the given content.
 *
 * @param {number} [numServers] - The desired number of web servers.
 * @param {string} [text] - The text to put in index.html.
 * @returns {Container[]}
 * */
function appWithContent(numServers, text) {
  const appContainers = [];
  for (let i = 0; i < numServers; i += 1) {
    appContainers.push(new kelda.Container('web', 'nginx', {
      filepathToContent: { [indexPath]: text },
    }));
  }
  return appContainers;
}

const appleApp = appWithContent(2, 'Apples!\n');
const orangeApp = appWithContent(2, 'Oranges!\n');

// Create a load balancer to sit in front of `appContainers`.
const loadBalancer = haproxy.withURLrouting({
  'apples.com': appleApp,
  'oranges.com': orangeApp,
});

// Allow requests from the public internet to the load balancer on port 80.
loadBalancer.allowFrom(kelda.publicInternet, haproxy.exposedPort);

// Deploy the application containers and load balancer.
const inf = kelda.baseInfrastructure();
appleApp.forEach(container => container.deploy(inf));
orangeApp.forEach(container => container.deploy(inf));
loadBalancer.deploy(inf);
