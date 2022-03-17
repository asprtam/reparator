<script>
	import { Router, Route, Link } from "svelte-navigator";
	import Main from './Pages/main.svelte';
	import Uslugi from './Pages/uslugi.svelte';
	import Cennik from './Pages/cennik.svelte';
	import Realizacje from './Pages/realizacje.svelte';
</script>
<Router>
<Route path="">
	<Main></Main>
</Route>
<Route path="uslugi">
	<Uslugi></Uslugi>
</Route>
<Route path="cennik">
	<Cennik></Cennik>
</Route>
<Route path="realizacje">
	<Realizacje></Realizacje>
</Route>
</Router>