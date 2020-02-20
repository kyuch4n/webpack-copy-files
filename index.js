const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
const baseWebpackConf = require("./webpack.base.config");
const cloneDeep = require("lodash.clonedeep");
const fse = require("fs-extra");

function formatIdentity(i) {
  return i.split("!");
}

function formatSize(s) {
  if (s < 2048) return s + " bytes";
  s /= 1024;
  if (s < 2048) return Math.round(s) + " KiB";
  s /= 1024;
  return Math.round(s) + " MiB";
}

function checkEntry(webpackConf = {}) {
  const { entry } = webpackConf;

  if (!entry) {
    throw new Error("missing webpack entry!");
  }

  if (typeof entry !== "string") {
    throw new Error("only support single entry");
  }
}

function checkOutput(webpackConf = {}) {
  const { output = {} } = webpackConf;
  const outputPath = output.path;

  if (!outputPath) {
    throw new Error("missing output.path!");
  }

  return outputPath;
}

/********************************************************************
 * @public
 ********************************************************************/

async function resolve(webpackConf = {}, filters = []) {
  if (typeof webpackConf === "string") {
    webpackConf = {
      entry: webpackConf
    };
  } else {
    webpackConf = cloneDeep(webpackConf);
  }

  checkEntry(webpackConf);

  if (filters && filters instanceof RegExp) {
    filters = [filters];
  }

  if (webpackConf.output) {
    delete webpackConf.output;
  }

  const mergedConf = merge(baseWebpackConf, webpackConf);

  return new Promise((resolve, reject) => {
    webpack(mergedConf, (err, stats) => {
      if (err) {
        reject(err);
      }

      const statsJson = stats.toJson();

      if (statsJson.errors && statsJson.errors.length) {
        reject(statsJson.errors.join("\n"));
      }

      const modules = (statsJson.modules || []).map(m => {
        const identifier = formatIdentity(m.identifier);
        /** 根据 filters 的规则，找到排除或者包含的模块 */
        const include = identifier.filter(i => filters.every(f => !f.test(i)));
        const exclude = identifier.filter(i => filters.some(f => f.test(i)));

        return {
          id: m.id,
          include,
          exclude,
          size: formatSize(m.size)
        };
      });
      resolve(modules);
    });
  });
}

async function resolveAndCopy(webpackConf = {}, filters) {
  webpackConf = cloneDeep(webpackConf);

  const entryAbsPath = webpackConf.entry;
  const entryFileName = path.basename(entryAbsPath);

  const destAbsDir = checkOutput(webpackConf);
  const destAbsPath = path.join(destAbsDir, entryFileName);

  const modules = await resolve(webpackConf, filters);
  /** 所有依赖模块的绝对路径 */
  const moduleOriAbsPaths = modules.reduce((accu, curr) => accu.concat(curr.include), []);

  /** 计算每个依赖模块 目标地址 的绝对路径 */
  const moduleDestAbsPaths = moduleOriAbsPaths
    .map(from => {
      const rel = path.relative(entryAbsPath, from);
      const to = path.resolve(destAbsPath, rel);
      return { from, to };
    })
    .filter(({ from, to }) => from !== to);

  /** copy */
  return Promise.all(moduleDestAbsPaths.map(({ from, to }) => fse.copy(from, to)));
}

module.exports = {
  resolve,
  resolveAndCopy
};
