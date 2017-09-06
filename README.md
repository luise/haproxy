# HAProxy for Quilt

This repository implements a HAProxy blueprint for Quilt. The module has two different
constructors: `simpleLoadBalancer` and `withURLrouting`.

### simpleLoadBalancer
`simpleLoadBalancer` creates an HAProxy container that load balances
over a group of containers, using sticky sessions. It takes the following
arguments:

```javascript
@param {Container[]} containers The containers whose traffic should be load balanced.
@param {string} [balance=roundrobin] balance The load balancing algorithm to
  use. See the HAProxy docs for possible algorithms.
```

HAProxy will communicate with the containers behind it on port 80.

#### Example
```javascript
const {Container} = require('@quilt/quilt');
const haproxy = require('@quilt/haproxy');

const proxy = haproxy.simpleLoadBalancer(new Container('web', 'nginx').replicate(3)));
```
The `proxy` variable now refers to a HAProxy container that does
roundrobin load balancing over 3 nginx containers.

### withURLrouting
The `withURLrouting` constructor creates an HAProxy container that performs load
balanced, URL based routing with sticky sessions. It uses session cookies to implement
the sticky sessions.
Very similar to above, the constructor takes the following arguments:

```javascript
@param {Object.<string, Container[]>} domainToContainers A map from domain name
to the containers that should receive traffic for that domain.
@param {string} [balance=roundrobin] The load balancing algorithm to use.
  See the HAProxy docs for possible algorithms.
```

HAProxy will communicate with the services behind it on port 80.

#### Example

```javascript
const proxy = haproxy.withURLrouting({
 	'webA.com': new Container('webA', 'nginx').replicate(3),
	'webB.com': new Container('webB', 'nginx').replicate(2),
});
```

`proxy` now refers to an HAProxy instance that sits in front of the
replicated websites at `webA.com` and `webB.com` respectively. Requests sent to the
HAProxy IP address will be forwarded to the correct web server as determined by the
`Host` header in the HTTP request. The proxy will have the following configuration:

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

    acl webA.com_req hdr(host) -i webA.com
    use_backend webA.com if webA.com_req

    acl webB.com_req hdr(host) -i webB.com
    use_backend webB.com if webB.com_req

backend webA.com
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server webA2.q webA2.q:80 check resolvers dns cookie webA2.q
    server webA3.q webA3.q:80 check resolvers dns cookie webA3.q
    server webA4.q webA4.q:80 check resolvers dns cookie webA4.q

backend webB.com
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server webB2.q webB2.q:80 check resolvers dns cookie webB2.q
    server webB3.q webB3.q:80 check resolvers dns cookie webB3.q
```

## Accessing the Proxy
To make the proxy accessible from the public internet, simply add the following
line to your blueprint:

```javascript
proxy.allowFrom(publicInternet, haproxy.exposedPort);
```

This will open port 80 on the proxy instance.

## More
See [Quilt](http://quilt.io) for more information.
