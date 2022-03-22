<script>
	import Header from "../Components/header/Header.svelte";
	import TextContainer3 from "../Components/textContainer/textContainer3.svelte";
	import Footer from '../Components/footer/footer.svelte';
    import Page from '../Scripts/page.js';
    import * as dataFuncs from './pageData/cennikData.js';
    import { onMount } from 'svelte';
    const dataSource = window.location.pathname.substr('cennikUslug/'.length + 1, window.location.pathname.length);
    const data = dataFuncs.getData(dataSource);
    const headline = dataFuncs.getHeadline(dataSource);
    onMount(() => {
		const page = new Page();
		page.init();
	});
</script>

<style lang="scss">
    .cennik {
        list-style-type: none;
        width: 100%;
        @media (max-width: 767.98px) {
            width: 90vw;
        }
        li {
            width: 100%;
            display: flex;
            font-family: Poppins;
            color: #fff;
            font-weight: 500;
            padding: 0.1vw 0;
            letter-spacing: 0.05em;
            span {
                width: 20%;
                text-align: center;
                @media (max-width: 767.98px) {
                    width: 23%;
                }
            }
            span:first-child {
                text-align: left;
                width: 58%;
                padding-left: 2%;
                @media (max-width: 767.98px) {
                    width: 46%;
                    padding-left: 4%;
                }
            }
        }
        li:first-child {
            color: #fbd232;
            font-size: 1.2em;
            margin-bottom: 0.5vw;
            span:first-child {
                width: 59%;
                padding-left: 1%;
                @media (max-width: 767.98px) {
                    width: 48%;
                    padding-left: 2%;
                }
            }
            span:nth-child(2):after {
                //content: 'Czas wykonania:';
                @media (max-width: 767.98px) {
                    //content: 'Czas:';
                }
            }
            span:nth-child(3):after {
                content: 'Cena:';
            }
        }
        li:nth-child(2n) {
            background: rgba(#fbd232, 60%);
        }
    }
    h2 {
        color: #ffd400;
		font-size: 1.3em;
		letter-spacing: 0.07em;
		width: 100%;
		font-weight: 400;
		text-align: center;
		font-family: Poppins;
		margin-bottom: 2vw;
		@media (max-width: 767.98px) {
			width: 90%;
			font-size: 1.4em;
            letter-spacing: 0.02em;
            font-weight: 500;
			margin-left: 5%;
			margin-bottom: 6vw;
		}
    }
</style>
	<Header></Header>
	<TextContainer3 className="dzialalnosc">
        <h2>{headline}</h2>
        <ul class="cennik">
            <li>
                <span>Nazwa usługi:</span>
                <span></span>
                <span></span>
            </li>
            {#each data as item}
                <li>
                    <span>{item[0]}</span>
                    <span>{item[1]}</span>
                    <span>{item[2]}</span>
                </li>
            {/each}
        </ul>
	</TextContainer3>
	<Footer></Footer>