# SnowHaze Firefox Extension

SnowHaze is on a mission to protect your online privacy. This Firefox extension gathers the most important privacy and security features from the SnowHaze iOS browser and makes them available for Firefox users. 

The extension allows you to create fully isolated tabs that do not share any data between each other. Furthermore, secure HTTPS connections are forced to establish encrypted connections to websites and mixed content is blocked to avoid malicious attacks. Additionally, privacy settings native to Firefox can easily be changed without having to get lost in about:config.

SnowHaze also offers other products for privacy protection such as the SnowHaze iOS browser and SnowHaze VPN with its anonymous protocol „Zero-Knowledge Auth“. More details about SnowHaze can be found on the [SnowHaze Website](https://snowhaze.com/).

Get the SnowHaze Firefox extension for free from [Mozilla](https://addons.mozilla.org/en-US/firefox/addon/snowhaze/).

Get SnowHaze on iOS for free from the [App Store](https://snowhaze.com/download).

## License

This extension is licensed under the GPL v3 license.

Disclaimer: The GPL license is not a free license and GPL licensed software is not free software. The GPL license restricts your rights to use software heavily. It is designed specifically to be incompatible with many other licenses and because of this we are bound to use the GPL license. Since the GPL license confines you to the GPL ecosystem, it contradicts the very essence of free software and thus we do not endorse it.

## Getting Started

The easiest way to get the SnowHaze extension for Firefox is directly through [Mozilla](https://addons.mozilla.org/en-US/firefox/addon/snowhaze/). 

Alternatively, you can also (temporarily) install it directly from source, by following the steps outlined below:

- Clone this repository

- Open Firefox

- Type „about:debugging“ in the search bar and press enter

- Click „This Firefox“

- Click „Load Temporary Add-on“

- Choose any file from the cloned respository

Now the extension will be installed and stays until you restart Firefox.

## Build it Yourself

You can build the extension yourself to use in the Developer Edition, Nightly, or ESR versions of Firefox.

- Clone this repository

- Run `./package.sh`

- Type „about:addons“ in the search bar, press enter, and confirm that you accept the risk

- Toggle `xpinstall.signatures.required` to false

- Type „about:addons“ in the search bar and press enter

- Click the setting gear and choose "Install Add-on From File..."

- Choose the `.xpi` file

Now the extension will be installed and stays in Firefox.

## Versioning

This is not our working repository and we only push versions to this repository that have made it through Mozilla's review process and will be released.

## Contributing

Please get in touch with us if you would like to contribute to any of our projects. We would love to have you on board with us! As this is not our working repository, we cannot accept pull-requests on this repository.

## Support

Do not hesitate to [contact us](https://snowhaze.com/en/support-contact.html) if you have any questions.

## Authors

SnowHaze was created by Illotros GmbH, all rights reserved.