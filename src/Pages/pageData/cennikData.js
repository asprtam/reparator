export function getData(name) {
    if(name == "sciany") {
        return [
            ["Suchy tynk do 3m wysokości", "", "49zł / m²"],
            ["Suchy tynk powyżej 3m wysokości", "", "59zł / m²"],
            ["Zabudowa prostoliniowa ścian do 3m wys. od podłogi do sufitu", "", "59zł / m²"],
            ["Zabudowa łukowa ścian do 3m wys.", "", "99zł / m²"],
            ["Zabudowa prostoliniowa ścian powyżej 3m wys. od podłogi do sufitu", "", "69zł / m²"],
            ["Zabudowa łukow ścian powyżej 3m wys.", "", "89zł / m²"],
            ["Częściowa zabudowa ściany prostoliniowej", "", "79zł / m²"],
            ["Częściowa zabudowa ściany łukowej", "", "99zł / m²"],
            ["Zabudowa ścian z widocznymi rurami/instalacjami wodno-kanalizacyjnymi do 3m wys.", "", "149zł / m²"],
            ["Zabudowa ścian z widocznymi rurami/instalacjami wodno-kanalizacyjnymi powyżej 3m wys.", "", "159zł / m²"],
            ["Postawienie prostoliniowej ścianki działowej do 3m wys. od podłogi do sufitu", "", "79zł / m²"],
            ["Postawienie łukowej ścianki działowej do 3m wys. od podłogi do sufitu", "", "99zł / m²"],
            ["Postawienie prostoliniowej ścianki działowej powyżej 3m wys. od podłogi do sufitu", "", "89zł / m²"],
            ["Postawienie łukowej ścianki działowej powyżej 3m wys. od podłogi do sufitu", "", "109zł / m²"],
            ["Postawienie grodzi prostoliniowej do 3m wys.", "", "99zł / m²"],
            ["Postawienie grodzi łukowej do 3m wys.", "", "117zł / m²"],
            ["Wykonanie stelarza pod drzwi", "", "99zł / m²"],
            ["Wykonanie stelarza pod drzwi", "", "149zł / m²"],
            ["Zabudowa/postawienie ścianki/gordzi działowej o zakrresie krzywoliniowym (roboczogodzina)", "", "79zł / szt."],
            ["Wykonanie wnęki prostoliniowej", "", "79zł / m²"],
            ["Wykonanie wnęki łukowej", "", "99zł / m²"],
            ["Montaż sufitu jednopoziomowego na stelażu jednokierunkowym", "", "79zł / m²"],
            ["Montaż sufitu jednopoziomowego na stelażu krzyżowym", "", "119zł / m²"],
            ["Montaż prostoliniowego sufitu dwupoziomowego", "", "139zł / m²"],
            ["Montaż łukowego sufitu dwupoziomowego", "", "159zł / m²"],
            ["Montaż sufitu kasetonowego", "", "89zł / m²"],
            ["Zabudowa sufitu krzywoliniowego lub wielopoziomowego (roboczogodzina)", "", "79zł / szt."],
            ["Montaż poddasza z ociepleniem", "", "99zł / m²"],
            ["Montaż poddasza bez ocieplenia", "", "69zł / m²"],
            ["Montaż ocieplenia poddasza", "", "39zł / m²"],
            ["Montaż zabudowy wnęki okna dachowego/wyłazu", "", "259zł / m²"],
            ["Montaż zabudowy wnęki okna lukarnowego", "", "369zł / m²"],
            ["Dodatkowe poszycie z płyt G-K/OSB", "", "29zł / m²"],
            ["Wypełnienie stelaża wełną/styropianem/pianką", "", "29zł / m²"],
            ["Wykonanie dodatkowego stelaża do zabudowy", "", "29zł / m²"],
            ["Wykończenie płyt G-K do poziomu Q3/Q4", "", "29zł / m²"],
            ["Wykonanie stelarza pod drzwi", "", "29zł / m²"]
        ]
    }
    if(name == "wodKan") {
        return [
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"]
        ]
    }
    if(name == "elektryka") {
        return [
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"]
        ]
    }
    if(name == "inne") {
        return [
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"],
            ["nazwa uslugi", "", "29"]
        ]
    }
    return [];2
}
export function getHeadline(name) {
    if(name == "sciany") {
        return "Cennik ściany i sufity";
    }
    if(name == "wodKan") {
        return "Cennik wod - kan";
    }
    if(name == "elektryka") {
        return "Cennik elektryka";
    }
    if(name == "inne") {
        return "Cennik inne prace";
    }
    return "";
}