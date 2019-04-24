# ncdus3

Inspired by [ncdu-s3](https://github.com/EverythingMe/ncdu-s3), and generate smaller ncdu feed by default.

## Install

```bash
# nodejs v10+ is required
npm i -g ncdus3
```

To view the output json file, you also need to install [ncdu](https://dev.yorhel.nl/ncdu).

## Usage

```bash
# first, make sure you can access s3 in your terminal environment.
# then run this tool
ncdus3 <s3location> <outputfile>

# example:
ncdus3 s3://mybucket/some/path output.json

# by default, ncdus3 will combine files to generate smaller feed
# you can also turn it off
ncdus3 s3://mybucket/some/path output.json --no-combine

# once it is done, view the result with ncdu
ncdu -f output.json
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D
