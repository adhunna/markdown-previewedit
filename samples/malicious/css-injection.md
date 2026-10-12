# CSS injection

Only colour, background colour and font size may survive, with plain values.

<span style="color:red; position:fixed; top:0; left:0; width:100%; height:100%">overlay</span>

<span style="background:url(https://tracker.example/pixel.png)">tracking pixel</span>

<span style="background-color:url(javascript:alert(1))">javascript url</span>

<span style="color:expression(alert(1))">IE expression</span>

<span style="font-size:999px">huge text</span>

<span style='color:red;behavior:url(x.htc);-moz-binding:url(x.xml#x)'>legacy bindings</span>

<div style="color:red; background-image:url(https://tracker.example/b.png)">block with tracking</div>

<span style="color:var(--x)">custom property</span>

<span style="color:#00f" onclick="alert(1)">handler on a styled span</span>

<style>@import url(https://evil.example/x.css); body { display:none }</style>

<span style="font-size:1.25em; color:rgb(9,105,218)">this one is fine</span>
