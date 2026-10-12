# Unclosed and malformed HTML

<div <script>alert(1)</script>

<a href="https://ok.example" onclick="alert(1)">link with handler</a>

<p style="background:url(javascript:alert(1))">styled</p>

<!-- <script>alert(1)</script> -->

<scr<script>ipt>alert(1)</script>
