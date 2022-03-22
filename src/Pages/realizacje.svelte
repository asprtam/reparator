<script>
	import Header from "../Components/header/Header.svelte";
	import SegmentedElement from "../Components/segmentedElement/segmentedElement.svelte";
	import Footer from '../Components/footer/footer.svelte';
	import Gallery from '../Components/gallery/gallery.svelte';
	import Page from '../Scripts/page.js';
	import { onMount } from 'svelte';
    onMount(() => {
		const page = new Page();
		page.init();
	});
	const segmentedElementPkg = {
		bg: './media/plumbing.jpg',
		type: 'gallery'
	}
</script>

<style lang="scss">
</style>

	<Header></Header>
	<SegmentedElement {...segmentedElementPkg}>
		<Gallery itemNumber="{8}"></Gallery>
	</SegmentedElement>
	<Footer></Footer>