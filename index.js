var fs = require('fs-extra')
var prompt = require('prompt')
var path = require('path')
var uuid = require('uuid')
var koa = require('koa')
var serve = require('koa-static')
var route = require('koa-route')
var Mock = require('mockjs')
var Handlebars = require('handlebars')
var request = require('request')
var GenerateSchema = require('generate-schema')

exports.config = function() {
    prompt.message = ''
    prompt.delimiter = ''
    prompt.start()
    prompt.get({
        properties: {
            domain: {
                required: true,
                message: 'Login domain, example www.kongge.com: '
            },
            username: {
                required: true,
                message: 'Login username: '
            },
            password: {
                required: true,
                message: 'Login password: '
            }
        }
    }, function(err, result) {
        if (err) {
            return console.log(err.message.red)
        }

        // save config
        fs.writeJSONSync(path.join(__dirname, 'config.json'), result)
        console.log('config success!!!'.green)
    })
}

exports.launch = function(port) {
    var app = koa()
    var rootPath = process.cwd()
    app.use(route.get(/.*\.html.*/i, function *() {
        var tplPath = path.join(rootPath, this.request.url.replace(/\.html.*/i, ''))
        var tpl = fs.readFileSync(tplPath + '.tpl').toString()
        var mock = fs.readJSONSync(tplPath + '.mock')
        var data = Mock.mock(mock)
        this.body = Handlebars.compile(tpl)(data)
        console.log(('Request ' + this.request.url).green)
    }))
    app.use(serve(rootPath))
    app.listen(port, function() {
        console.log(('TPT server running at ' + port).green)
    })
}

exports.create = function(name) {
    if (!name) {
        console.log('Missing template name!'.red)
        return
    }

    // copy template files
    var TEMPLATE_PATH = 'template'
    var MOCK_FILE_NAME = 'layout.mock'
    var TPL_FILE_NAME = 'layout.tpl'
    var CONFIG_FILE_NAME = 'layout.config'
    var cwd = process.cwd()
    var pathMock = path.join(cwd, name + '.mock')
    var pathTpl = path.join(cwd, name + '.tpl')
    var pathConfig = path.join(cwd, name + '.config')

    fs.copySync(path.join(__dirname, TEMPLATE_PATH, MOCK_FILE_NAME), pathMock)
    console.log(('created file: ' + pathMock).green)
    fs.copySync(path.join(__dirname, TEMPLATE_PATH, TPL_FILE_NAME), pathTpl)
    console.log(('created file: ' + pathTpl).green)
    fs.copySync(path.join(__dirname, TEMPLATE_PATH, CONFIG_FILE_NAME), pathConfig)
    var config = fs.readJSONSync(pathConfig)
    config.id = uuid.v4()
    fs.writeJSONSync(pathConfig, config)
    console.log(('created file: ' + pathConfig).green)
    console.log('gogogo!!!'.green)
}

exports.publish = function(name) {
    if (!name) {
        return console.log('请输入需要发布的模板路径'.red)
    }
    if (!fs.existsSync(path.join(__dirname, 'config.json'))) {
        return console.log('Please run tpt config'.red)
    }

    var config = fs.readJSONSync(path.join(__dirname, 'config.json'))
    var tplPath = path.join(process.cwd(), name)
    var mockPath = path.join(process.cwd(), name) + '.mock'
    var mock = fs.readJSONSync(mockPath)
    var mockData = Mock.mock(mock)
    var oldSchema, newSchema
    var schemaPath = tplPath + '.schema'
    var tplConfig = fs.readJSONSync(path.join(process.cwd(), name) + '.config')

    if (!tplConfig.name) {
        return console.log('请配置 .config 文件 name 属性'.red)
    }

    if (fs.existsSync(schemaPath)) {
        oldSchema = fs.readJSONSync(schemaPath)
    }

    newSchema = GenerateSchema.json('数据编辑器', mockData)

    // copy default value
    copyDefault(newSchema, mockData)
    copyDescription(newSchema, oldSchema)
    fs.writeJSONSync(schemaPath, newSchema)

    // check field description
    if (!isValidSchema(newSchema)) {
        return console.log('请为 schema 配置正确的 description 字段，让运营同学能读懂字段代表的含义'.red)
    }

    // login
    console.log('正在验证身份...'.green)
    request.post({
        url: 'http://' + config.domain + '/loginVerify.action',
        form: {
            nick: config.username,
            password: config.password
        }
    }, function(err, httpResponse, body) {
        if (err) {
            console.log(err.message.red)
            return
        }

        if (httpResponse.statusCode != 302) {
            console.log('用户名或密码错误，请重新配置'.red)
            return
        }

        console.log('身份...ok'.green)
        var j = request.jar();
        var cookies = httpResponse.headers['set-cookie']
        var cookie = request.cookie(cookies[0])
        var cookie2 = request.cookie(cookies[1])
        var url = 'http://' + config.domain
        j.setCookie(cookie, url)
        j.setCookie(cookie2, url)

        console.log('正在发布...'.green)
        request.post({
            url: 'http://' + config.domain + '/h5Template/save',
            jar: j,
            formData: {
                id: tplConfig.id,
                name: tplConfig.name,
                template: fs.createReadStream(path.join(process.cwd(), name) + '.tpl'),
                schema: fs.createReadStream(path.join(process.cwd(), name) + '.schema')
            }
        }, function(err, httpResponse, body) {
            if (err) {
                return console.log(err.message.red)
            }
            if (httpResponse.statusCode !== 200) {
                return console.log((httpResponse.statusCode + " : " + httpResponse.statusMessage).red)
            }

            console.log('发布成功 ^.^'.green)
        })
    })
}

function isValidSchema(schema) {
    for (var k in schema.properties) {
        var v = schema.properties[k]

        if (!v.description || v.description === '请输入字段描述') {
            return false
        }

        if (v.type === 'array') {
            v = v.items
        }
        if (v.type === 'object') {
            if (!isValidSchema(v)) {
                return false
            }
        }
    }
    return true
}

function copyDescription(newSchema, oldSchema) {
    if (!oldSchema) {
        oldSchema = {}
    }

    newSchema.description = oldSchema.description

    for (var k in newSchema.properties) {
        var v = newSchema.properties[k]
        var ov = oldSchema.properties && oldSchema.properties[k] || {}
        v.description = ov.description || '请输入字段描述'

        if (v.type === 'array') {
            v = v.items
            ov = ov.items || null
        }
        if (v.type === 'object') {
            copyDescription(v, ov)
        }
    }
}

function copyDefault(schema, data) {
    for (var k in schema.properties) {
        var v = schema.properties[k]
        var ov = data[k]
        v.default = ov

        if (v.type === 'array') {
            v = v.items
            ov = data[k][0]
        }
        if (v.type === 'object') {
            copyDefault(v, ov)
        }
    }
}
