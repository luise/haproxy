/* eslint-env mocha */

const assert = require('chai').assert;
const kelda = require('kelda');
const haproxy = require('../haproxy');

describe('haproxy', () => {
  beforeEach(() => {
    kelda.resetGlobals();
  });

  describe('simpleLoadBalancer', () => {
    it('config', () => {
      const expConfig = `global

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

    default_backend default

backend default
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server foo.q foo.q:80 check resolvers dns cookie foo.q
    server foo2.q foo2.q:80 check resolvers dns cookie foo2.q
`;

      const containers = [];
      for (let i = 0; i < 2; i += 1) {
        containers.push(new kelda.Container({ name: 'foo', image: 'image' }));
      }
      const hap = haproxy.simpleLoadBalancer(containers);
      assert.equal(hap.filepathToContent['/usr/local/etc/haproxy/haproxy.cfg'],
        expConfig);
    });
  });

  describe('withURLrouting', () => {
    it('config', () => {
      const expConfig = `global

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

    acl domainA_req hdr(host) -i domainA
    use_backend domainA if domainA_req

    acl domainB_req hdr(host) -i domainB
    use_backend domainB if domainB_req

backend domainA
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server foo.q foo.q:80 check resolvers dns cookie foo.q

backend domainB
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server bar.q bar.q:80 check resolvers dns cookie bar.q
`;

      const domainA = [new kelda.Container({ name: 'foo', image: 'image' })];
      const domainB = [new kelda.Container({ name: 'bar', image: 'image' })];
      const hap = haproxy.withURLrouting({ domainA, domainB });
      assert.equal(hap.filepathToContent['/usr/local/etc/haproxy/haproxy.cfg'],
        expConfig);
    });
  });
});
