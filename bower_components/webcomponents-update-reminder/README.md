# Webcomponents-update-reminder
Remind your user to update your components just by adding one line.

(this element won't cause any network request unless the page is loaded from a web server running on `localhost`.)

## Get start
To use this element in your components:
```
<webcomponents-update-reminder
    repo="YOUR ELEMENT'S GITHUB REPO, FOR EXAMPLE: PolymerElements/paper-toolbar">
</webcomponents-update-reminder>
```
That's all! When your component have a new version, the user will recieve a info like this:

![a info in console](https://raw.githubusercontent.com/markhuang1212/webcomponents-update-reminder/master/info.JPG)

When the page is loaded from a web server running on `localhost`, the element will read the `version` in your repo master branch's `bower.json` and compare it with the local `bower.json` to detect if there is a new version, **only minor and major version update will remind user to update, unless your element's major version is 0.**

You need to mention that the `version` tag in your `bower.json` should be look like `X.Y.Z`. We recommend naming tags that fit within [semantic versioning](http://semver.org/).

## API Docs
http://open-elements.org/elements/webcomponents-update-reminder
