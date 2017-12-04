# Updating Documentation 

**Stylable** utilizes Jekyll in order to generate the Stylable.io website. The site is hosted on the `gh-pages` branch of this repo.


## How to Update
All changes to documentation are merged to master, the website rebuilt and deployed to the target branch (`gh-pages`).

To make your life easier, we've added a simple script to automate this process. 

In the root directory of your Stylable repo run the following command:
```bash
yarn deploy:site
```

or

```bash
npm run deploy:site
```



