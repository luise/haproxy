# HAProxy Examples with Kelda

This directory contains examples for Kelda's HAProxy blueprint.

To run the example blueprints:
1. [**Install Kelda**](http://docs.kelda.io/#installing-kelda) with
    ```console
    $ npm install -g @kelda/install
    ```
2. **Get the blueprints** by cloning this repository.
    ```console
    $ git clone https://github.com/kelda/haproxy
    ```
3. **Set up an infrastructure** by running `kelda init`. In the first question, name your infrastructure `default`.
4. **Install dependencies** by running `npm install` in the cloned
  `haproxy` directory.
5. **Start Kelda** by running `kelda daemon` in a different terminal window.
6. **Boot the applications** by running one of the following commands from
  this `haproxy/examples` directory.

    ```console
    $ kelda run ./haproxyExampleSingleApp.js
    ```
    or
    ```console
    $ kelda run ./haproxyExampleMultipleApps.js
    ```
7. **Stop the deployment** with `kelda stop` when you're done, and then kill
  the daemon with ctrl+c.

## Accessing the applications
#### `haproxyExampleSingleApp.js`
Use `kelda show` to check the status of the deployment. When all the containers
are running, simply copy paste the `PUBLIC IP` of the `haproxy` container into
a browser. If everything booted correctly, it should say "Hello, world!".

#### `haproxyExampleMultipleApps.js`
This blueprint boots two applications with the domain names `apples.com` and
`oranges.com` respectively. Both applications sit behind the HAProxy load
balancer, so they will have the same IP address. For that reason, we can't
simply access the applications through the IP as we did above.

Instead, we have to also include the domain name of the application we want to
access. This way the load balancer knows which servers to redirect our request
to. When all the containers are `running`, check that you can access both
applications by running the following commands from your terminal, and checking
the responses:

```console
$ curl -H "Host: apples.com" HAPROXY_PUBLIC_IP
Apples!
$ curl -H "Host: oranges.com" HAPROXY_PUBLIC_IP
Oranges!
```

To make your applications accessible through a browser, buy your domain names
through a registrar like Namecheap, and map the domains to the IP of your
`haproxy` container.

**Remember to stop the deployment with `kelda stop`!**

## More Info
For more details, check out our documentation for
[running a replicated, load balanced application behind a single IP address](http://docs.kelda.io/#how-to-run-a-replicated-load-balanced-application-behind-a-single-ip-address).
