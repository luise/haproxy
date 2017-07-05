# HAProxy for Quilt

This repository implements a HAProxy blueprint for Quilt. The module has two different
constructors: `singleServiceLoadBalancer` and `withURLrouting`.

### singleServiceLoadBalancer
`singleServiceLoadBalancer` creates a basic load balancer over a single service. It
takes the following arguments:

```javascript
@param {number} n - The desired number of HAProxy replicas.
@param {Service} service - The service whose traffic should be load balanced.
@param {string} [balance=roundrobin] - The load balancing alorithm to use. See possible algorithms in the HAProxy configuration manual for the `balance` keyword.
```

HAProxy will communicate with the services behind it on port 80.

#### Example
```javascript
const {Container, Service} = require('@quilt/quilt');
const haproxy = require('@quilt/haproxy');

let proxy = haproxy.singleServiceLoadBalancer(2, new Service('web',
	new Container('nginx').replicate(3)));
```
The `proxy` variable now refers to a HAProxy `Service` with 2 replicas that do
roundrobin load balancing over 3 nginx containers.

### withURLrouting
The `withURLrouting` constructor creates a replicated HAProxy service that performs load
balanced, URL based routing with sticky sessions. It uses session cookies to implement
the sticky sessions.
Very similar to above, the constructor takes the following four arguments:

```javascript
@param {number} n - The desired number of HAProxy replicas.
@param {Object.<string, Service>} domainToService - A map from domain name to the service that should handle requests for that domain.
@param {string} [balance=roundrobin] - The load balancing alorithm to use. See possible algorithms in the HAProxy configuration manual for the `balance` keyword.
```

HAProxy will communicate with the services behind it on port 80.

#### Example

```javascript
let proxy = haproxy.withURLrouting(2, {
 	'webA.com': new Service('webA', new Container('nginx').replicate(3)),
	'webB.com': new Service('webB', new Container('nginx').replicate(2)),
});
```

`proxy` now refers to a `Service` with 2 HAProxy instances that sits in front of the
replicated websites at `webA.com` and `webB.com` respecitvely. Requests sent to the
HAProxy IP address will be forwarded to the correct webserver as determined by the
`Host` header in the HTTP request. The proxies will have the following configuration:

```
global

defaults
    log     global
    mode    http
    timeout connect 5000
    timeout client 5000
    timeout server 5000

resolvers dns
    nameserver gateway 10.0.0.1:53

frontend http-in
    bind *:80
    acl webA_req hdr(host) -i webA.com
    acl webB_req hdr(host) -i webB.com
    use_backend webA if webA_req
    use_backend webB if webB_req

backend webA
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server webA-0 1.webA.q:80 check resolvers dns cookie webA-0
    server webA-1 2.webA.q:80 check resolvers dns cookie webA-1
    server webA-2 3.webA.q:80 check resolvers dns cookie webA-2

backend webB
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server webB-0 1.webB.q:80 check resolvers dns cookie webB-0
    server webB-1 2.webB.q:80 check resolvers dns cookie webB-1
```

## Accessing the Proxy
If you want the proxy to be accessible from the public internet, simply add the following
line to your blueprint:

```javascript
proxy.allowFrom(publicInternet, haproxy.exposedPort);
```

This will open port 80 on all proxy instances.

## More
See [Quilt](http://quilt.io) for more information.
