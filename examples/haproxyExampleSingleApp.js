const kelda = require('kelda');
const haproxy = require('../haproxy');

const indexPath = '/usr/share/nginx/html/index.html';

// Replicate the application container. Here we create 3 web server (nginx)
// containers with the text "Hello, world!" in their index file.
const appContainers = [];
for (let i = 0; i < 3; i += 1) {
  appContainers.push(new kelda.Container({
    name: 'web',
    image: 'nginx',
    filepathToContent: { [indexPath]: 'Hello, world!' },
  }));
}

// Create a load balancer to sit in front of `appContainers`.
const loadBalancer = haproxy.simpleLoadBalancer(appContainers);

// Allow requests from the public internet to the load balancer on port 80.
kelda.allowTraffic(kelda.publicInternet, loadBalancer, haproxy.exposedPort);

// Deploy the application containers and load balancer.
const inf = kelda.baseInfrastructure();
appContainers.forEach(container => container.deploy(inf));
loadBalancer.deploy(inf);
