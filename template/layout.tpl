<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="author" content="{{author}}">
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
    <meta name="format-detection" content="telephone=no">
    <meta name="tracker-id-t" content="20003">
    <meta name="tracker-id-dt" content="1_{{pageId}}">
    <title>{{title}}</title>
  </head>
  <body>
    <script>with(document)with(body)with(insertBefore(createElement("script"),firstChild))setAttribute("id","kongge-tracker",src="//g.kongge.com/tracker/t.js")</script>
    <h1>{{h1}}</h1>
    <h2>{{h2}}</h2>
    <p>{{intro}}</p>
    <ul>
      {{#each items}}
        <li>{{name}}: {{age}}</li>
      {{/each}}
    </ul>

    <ul>
      {{#each build}}
        <li> 
          <h3>{{name}}</h3>
          <ul>
            {{#floor}}
              <li>楼名：{{name}} 面积：{{area}}</li>
            {{/floor}}
          </ul>
        </li>
      {{/each}}
    </ul>
  </body>
</html>
