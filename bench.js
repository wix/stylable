const Benchmark = require('benchmark');
const { objectifyCSSStylis, objectifyCSS } = require('./dist/src/parser');

const suite = new Benchmark.Suite;
const smallCSS = `
    .btn::after {
        content: "abc";
    }
`;

const bigCSS = `
    body {
        font-size: 10px;
        font-family: Arial;
        float: right;
        padding: 0px;
        margin: 0px
    }

    .DivMain {
        width: 980px;
        height: 210px;
        background-image: url(../images/ynetshops980X210.png)
    }

    .TitleRed {
        font-size: 20px;
        color: #da1318;
        display: block;
        position: absolute;
        top: 10px;
        left: 10px;
        text-align: left
    }

    .image_carousel {
        padding: 37px 0px 0px 0px;
        position: relative
    }

    .item {
        text-align: center;
        width: 170px;
        height: 170px;
        border: 0px solid #ccc;
        padding: 0px 0px 0px 0px;
        margin: 0px 5px 0px 5px;
        display: block;
        float: left
    }

    .item a {
        outline: none;
        text-decoration: none
    }

    .item img {
        border: 0px;
        margin: 0px 0px 1px 0px
    }

    .Price {
        padding-right: 32px;
        font-size: 11px;
        color: #900;
        font-weight: bold;
        text-align: right
    }

    .productname {
        padding-right: 32px;
        font-size: 11px;
        text-align: right;
        color: #004b91;
        direction: rtl
    }

    a.prev,a.next {
        background: url(../images/miscellaneous_sprite.png) no-repeat transparent;
        width: 45px;
        height: 50px;
        display: block;
        position: absolute;
        top: 85px
    }

    a.prev {
        left: 5px;
        background-position: 0 0
    }

    a.prev:hover {
        background-position: 0 -50px
    }

    a.prev.disabled {
        background-position: 0 -100px!important
    }

    a.next {
        right: 5px;
        background-position: -50px 0
    }

    a.next:hover {
        background-position: -50px -50px
    }

    a.next.disabled {
        background-position: -50px -100px!important
    }

    a.prev.disabled,a.next.disabled {
        cursor: default
    }

    a.prev span,a.next span {
        display: none
    }

    .pagination {
        display: block;
        position: absolute;
        top: 40px;
        left: 10px;
        text-align: left
    }

    .pagination a {
        background: url(../images/miscellaneous_sprite.png) 0 -300px no-repeat transparent;
        width: 15px;
        height: 15px;
        margin: 0 5px 0 0;
        display: inline-block
    }

    .pagination a.selected {
        background-position: -25px -300px;
        cursor: default
    }

    .pagination a span {
        display: none
    }

    .clearfix {
        float: none;
        clear: both
    }

`;

// add tests 
suite.add('Stylis', function () {
        objectifyCSSStylis(smallCSS);
    })
    .add('postcss', function () {
        objectifyCSS(smallCSS)
    }).add('Stylis (big)', function () {
        objectifyCSSStylis(bigCSS);
    })
    .add('postcss (big)', function () {
        objectifyCSS(bigCSS)
    })
    // add listeners 
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        // console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    // run async 
    .run({ 'async': false });