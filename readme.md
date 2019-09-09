MyChangeLog
--------------------------------
simple tool for convert git commits to changelog markdown


## Run

```
curl https://raw.githubusercontent.com/YaroslavGaponov/mychangelog/master/index.js | node > CHANGELOG.md
```

## Info

### Release commits must be like this

```sh
git commit -am 'chore(release): 10.1.5'
```

### Example for other commits

```sh
git commit -am `fix(core): Some bug fix`
git commit -am `feat(metrics): Some new feature`
git commit -am 'test(logger): Added some tests'
```