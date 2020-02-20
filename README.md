# webpack-copy-files

## APIs

### AsyncFunction resolve(webpackConf[, filters])

```javascript
const path = require("path");
const copyFile = require("webpack-copy-file");

copyFile.resolve(
  {
    entry: path.resolve(__dirname, "./src/App.vue")
  },
  [/node_modules/, /\?/, /^external/]
);
```

### AsyncFunction resolveAndCopy(webpackConf[, filters])

```javascript
const path = require("path");
const copyFile = require("webpack-copy-file");

copyFile.resolveAndCopy(
  {
    entry: path.resolve(__dirname, "./src/App.vue"),
    output: {
      path: path.resolve(__dirname, "./dist")
    }
  },
  [/node_modules/, /\?/, /^external/]
);
```
