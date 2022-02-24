<script>
	import Header from "./Components/header/Header.svelte";
	import { onMount } from 'svelte';
	import Page from './Scripts/page.js';

	
	onMount(() => {
		const page = new Page();
		page.init();
		console.log(page.animatedElements);
	});

</script>

<Header></Header>

<div style="height: 200vh; background: #000; width:100%;">
</div>
<h3 data-animation="fadeUp">aass</h3>