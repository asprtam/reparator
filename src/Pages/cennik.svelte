<script>
	import Header from "../Components/header/Header.svelte";
	import TextContainer2 from "../Components/textContainer/textContainer2.svelte";
	import Footer from '../Components/footer/footer.svelte';
    import Page from '../Scripts/page.js';
    import { onMount } from 'svelte';
    onMount(() => {
		const page = new Page();
		page.init();
	});
</script>

<style lang="scss">
</style>
	<Header></Header>
	<TextContainer2 className="dzialalnosc">
		<p data-animation="fadeDown" data-delay="{0}">Jeżeli chcesz zlecić większy remont np. malowanie całego domu, na pewno możesz spodziewać się 
			od nas atrakcyjnego rabatu lub sporych udogodnień jak np. zakup materiałów bez prowizji lub
			transport materiałów własnym samochodem.
		</p>
		<p data-animation="fadeDown" data-delay="{0.2}">
			Szczegółową ofertę możemy przedstawić dopiero po obejrzeniu zlecenia i ustaleniu zakresu prac.
			Zwyczajowo o rabatach na usługi rozmawiamy przy pracach o wartości powyżej 6 tys. zł netto. 
		</p>
	</TextContainer2>
	<Footer></Footer>