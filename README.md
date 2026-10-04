# AgloSat

**Przeszkody, których miasto nie ma na mapie.** AgloSat wskazuje miastu, które niewiadome o infrastrukturze pieszej (chodnikach, przejściach, krawężnikach, schodach) sprawdzić najpierw, bo od nich zależy najwięcej dojść do usług. Pokazujemy to na sieci pieszej, bo tu najłatwiej policzyć skutki dla ludzi; ta sama metoda działa dla innej infrastruktury, o której miasto czegoś nie wie (drogi rowerowe, windy i rampy, przystanki).

Pilot: Nowa Huta, osiedla Wandy, Młodości i Na Skarpie (Kraków).

1. **Obraz z góry znajduje kandydatów.** Wycinki ortofotomapy pokazują miejsca, gdzie ciąg pieszy może być przerwany.
2. **Graf sieci pieszej nadaje im wagę.** Dla każdej niewiadomej liczymy, ile dojść z budynków mieszkalnych do przychodni, aptek, sklepów, poczty i bibliotek od niej zależy.
3. **Człowiek rozstrzyga.** Mieszkaniec zgłasza, jak jest na miejscu (ze zdjęciem); urząd przyjmuje albo odrzuca. Kontrola w terenie nadal ma pierwszeństwo. Trasy przeliczają się od razu po decyzji.

## Uruchomienie

Wymagany Node.js 22.18 lub nowszy (skrypty potoku to TypeScript uruchamiany bezpośrednio przez Node).

```bash
npm install
npm run dev
```

Aplikacja: http://localhost:3000, wdrożenie: https://aglosat6767.vercel.app. Widoki: `/app/planista` (urząd), `/app/mieszkaniec` („Czy dotrę?”, instalowalny na telefonie) i `/app/etykiety` (próbka do oceny modelu; zapis etykiet tylko lokalnie).

Przycisk **Tryb demo** w prawym dolnym rogu prowadzi przez scenariusz prezentacji (strzałki ← → przełączają kroki), 10 kroków:
mieszkaniec pyta o trasę → brakuje informacji o jednym przejściu → to przejście jest pierwsze w rankingu → dowód z ortofotomapy → mieszkaniec zgłasza stan ze zdjęciem → urząd decyduje → trasa udokumentowana → przypadek sprzeczny (OSM kontra model) → błąd modelu pokazany celowo → strefa zmian Sentinel-2.

Wszystkie dane demo są w repozytorium, więc aplikacja działa bez sieci, z wyjątkiem podkładu mapy (Esri World Imagery).

## Potok danych

```bash
npm run aglosat:fetch     # pobiera wycinek OSM do data/aglosat/osm-extract.json
npm run aglosat:sentinel  # strefy zmian z Sentinel-2 do data/aglosat/sentinel-zmiany.json
npm run aglosat:build     # buduje public/aglosat/pilot.json: graf, dowody, ranking, mianownik
npm run aglosat:wycinki   # pobiera brakujące wycinki ortofotomapy do public/aglosat/wycinki/
npm run aglosat:klasyfikuj -- --dostawca openrouter --model anthropic/claude-sonnet-5.5 --prompt 3
                          # klasyfikuje wycinki modelem wizyjnym (klucz w .env.local)
npm run aglosat:check     # sprawdza reguły modelu danych i spójność demo
```

Obszar i parametry są w `scripts/aglosat/config.ts`. Nowe miasto to nowy obszar w tej konfiguracji: inny wycinek OSM, ta sama logika.

## Co jest prawdziwe, a co przykładowe

| Element | Status |
| --- | --- |
| Sieć piesza, nawierzchnia, schody, krawężniki, szerokość, budynki, usługi | OpenStreetMap, dane pobrane 2026-10-03 |
| Ranking miejsc do kontroli, mianownik, skrajny przypadek | policzone na tym grafie (analiza bazowa) |
| Trasy dla profilu, przeliczanie po kontroli, trasa kontroli | liczone w przeglądarce, na żywo |
| Wycinki ortofotomapy | GUGiK (Geoportal), nalot 2025-04-28, piksel 5 cm |
| Klasy dla wycinków | model Claude Sonnet 5.5 (przez OpenRouter), wyniki zapisane w repo |
| Próbka referencyjna | 203 wycinki opisane ręcznie według instrukcji v2, niezależnie przez dwie osoby; 91 z nich to zbiór testowy |
| Strefy zmian | Sentinel-2 L2A, dwie pary scen rok do roku (sierpień i wrzesień 2025 → 2026) |
| Kontrole w terenie | wpisywane w sesji; trwały zapis to krok po hackathonie |
| Zgłoszenia mieszkańców | w tej samej karcie przeglądarki (`sessionStorage`); przyjęcie liczy je jak źródło, samo zgłoszenie nie |

## Model wizyjny

**Zadanie.** Model dostaje wycinek ortofotomapy z naniesionym przebiegiem odcinka z OSM i odpowiada jedną klasą: ciągły, przerwany albo niewidoczny, z oceną i jednym zdaniem uzasadnienia. Zasady są wspólne dla ludzi i modelu (`lib/aglosat/etykiety.ts`): ciągłość to pytanie, czy wzdłuż linii biegnie jeden nieprzerwany pas, po którym da się przejść; nawierzchnia, krawężniki, schody i auta to osobne cechy.

**Wyniki** (Claude Sonnet 5.5, zbiór testowy: 91 wycinków nieużywanych przy poprawianiu promptu, każdy opisany niezależnie przez dwie osoby; trafność liczona na 182 parach człowiek–model):

| Wersja | Co zmieniliśmy | Trafność |
| --- | --- | --- |
| prompt v1 | proste definicje klas | 45% |
| prompt v2 | zasada ciągłości i tabela 13 przypadków spornych (droga, przejście, parking, auta, zieleń…) | 56% |
| prompt v3 | dwa obrazy: bez linii i z linią; linia zasłaniała wąskie ścieżki, o które pytamy | 67% |
| prompt v4 | doprecyzowana zasada dla drzew i cienia: pas wchodzi pod drzewa i wychodzi w tej samej linii → ciągły | 70% |

**Punkt odniesienia: dwie osoby zgadzają się ze sobą na 75% wycinków testowych.** Model v4 zgadza się z jedną z nich na 65%, z drugą na 75%, czyli mniej więcej tak, jak ludzie między sobą.

Groźne pomyłki (model „ciągły”, człowiek widzi przerwę albo nic) w kolejnych wersjach: 7, 9, 15, 20 na 182 pary. Każda poprawka, po której model rzadziej mówi „nie widzę”, podnosi trafność i jednocześnie dokłada kilka groźnych pomyłek; dlatego pokazujemy obie liczby.

**Prompt v4.** Najwięcej rozbieżności dawały wycinki, gdzie ścieżka znika pod drzewami: człowiek dopowiadał zasłonięty fragment, model trzymał się dosłownie „większości linii nie widać”. Ponowny przegląd 64 wycinków zmienił tylko 5 etykiet, więc to była różnica definicji, nie pośpiech. Zasadę dopisaliśmy do instrukcji (`lib/aglosat/etykiety.ts`; brzmienie dla promptów v2 i v3 jest zamrożone) i do promptu v4. Prompt poprawialiśmy na zbiorze roboczym (62% → 72%), zbiór testowy policzyliśmy raz (etykiety pierwszej osoby: 60% → 65%; obu osób: 67% → 70%).

**Które pomyłki są groźne.** Groźne jest tylko „ciągły” tam, gdzie człowiek widzi przerwę albo nic nie widzi: v4 robi ich 20 na 182 pary (11%). Pozostałe pomyłki to ostrożność („niewidoczny” w głębokim cieniu i pod drzewami); kosztują dodatkową kontrolę w terenie.

Gdy model mówi „ciągły”, zwykle ma rację (82% na zbiorze testowym, v4), a wycinki, na których człowiek nic nie widzi, model też oznacza jako „niewidoczny” (81%). **Model rzadko znajduje przerwy:** na zbiorze testowym wskazał 3 z 18 przerw zaznaczonych przez ludzi. Dlatego w AgloSat model zawęża listę miejsc do sprawdzenia, a przerwy rozstrzyga człowiek w terenie. Zgodność z obrazem to nie to samo co stan w terenie.

**Uwagi.**
- Etykiety pochodzą od dwóch osób z zespołu, opisujących niezależnie, bez wglądu w odpowiedzi modelu (strona `/app/etykiety`). Opisywali szybko (mediana około 1–1,5 s na wycinek), więc liczby traktujemy jako orientacyjne.
- Dane w aplikacji pochodzą z promptu v2 (`KLASYFIKACJA` w `scripts/aglosat/config.ts`), bo zawierają przypadek sprzeczny pokazywany w demo: przerwę, którą model zgłosił, bo ścieżkę zasłoniła nasza linia. Prompt v3 ten błąd naprawia.
- Podział na zbiór roboczy (112) i testowy (91) jest zamrożony w `data/aglosat/proba-oceny.json`; prompt poprawialiśmy, patrząc na zbiór roboczy. Przy tej liczbie wycinków liczby są orientacyjne.
- Prototyp działa bez klucza API: wyniki modelu są w `data/aglosat/klasyfikacje/`. Klucz jest potrzebny tylko do ponownej klasyfikacji. Pierwszy przebieg (Qwen przez Groq, prompt v1, 56 wycinków) jest zachowany w historii.

## Sentinel-2: strefy zmian

Ortofotomapa jest z kwietnia 2025, a teren się zmienia. Sentinel-2 (10 m, co kilka dni) nie pokaże chodnika, ale pokaże, gdzie od tamtej pory coś się działo: odcinki w takiej strefie dostają adnotację „dane mogą być nieaktualne”.

**Metoda** (`scripts/aglosat/sentinel.ts`, klasyczna teledetekcja, bez uczenia):
- dwie pary scen z tej samej pory roku: 2025-08-13 → 2026-08-14 i 2025-09-20 → 2026-09-08 (Sentinel-2 L2A z archiwum Element84, bez logowania);
- maska SCL odrzuca chmury, cienie chmur i ciemne piksele;
- zmiana: wskaźnik roślinności NDVI zmienia się o co najmniej 0,2 **w obu parach i w tym samym kierunku**, co odsiewa jednorazowe różnice (cień, wilgoć, koszenie);
- spójne grupy co najmniej 3 pikseli (300 m²) zamieniane na wielokąty.

**Wynik:** 6 stref, wszystkie to ubytek roślinności; dotykają 8 odcinków sieci pieszej. Dwie z nich leżą tam, gdzie OSM ma chodniki oznaczone jako w budowie (`construction=footway`), a jedna obejmuje odcinek przy placu budowy, na którym model wizyjny zgłosił przerwę. Te trzy źródła (OSM, model, Sentinel) są niezależne. Wynik jest w repo, więc demo nie potrzebuje sieci.

## Reguły modelu danych

- Brak danych nigdy nie staje się „przejezdne”. Status cechy wynika z dowodów, a nie jest wpisywany.
- Data pobrania, data obrazu, data kontroli i data zgłoszenia to osobne pola.
- Zgłoszenie mieszkańca nie rozstrzyga cechy, dopóki urząd go nie przyjmie. Odrzucone znika z dowodów.
- Dwa sprzeczne źródła dają status „sprzeczne” i pokazują oba.
- Trasa udokumentowana używa tylko odcinków, których każda cecha wymagana przez profil ma źródło i spełnia profil. Trasa wymagająca weryfikacji dopuszcza niewiadome i je wymienia.

`npm run aglosat:check` pilnuje tych reguł i spójności scenariusza demo.

## Znane ograniczenia

- **Przechył budynków na ortofotomapie.** Dachy wysokich bloków przykrywają chodniki wzdłuż ścian, więc model patrzący na wycinek może zgłosić przerwę, której nie ma. Dlatego decyduje kontrola w terenie.
- **Krawężniki** są w OSM opisywane na przejściach. Na pozostałych odcinkach przyjmujemy jawne założenie, że krawężnika nie ma; interfejs pokazuje je jako założenie.
- **Waga budynku** to powierzchnia zabudowy razy liczba kondygnacji: przybliżenie skali zabudowy, nie liczby mieszkańców. Przy równych wagach skład pierwszej dziesiątki rankingu się nie zmienia (10/10 mieści się w pierwszej 20), zmienia się kolejność.
- **Data ortofotomapy** pochodzi ze skorowidza GUGiK dla arkusza M-34-65-C-c-1-2; zakładamy, że usługa WMS HighResolution pokazuje najnowszy arkusz.
- **Kostka granitowa** jest traktowana jako utrudnienie, nie bariera.

## Dostępność interfejsu

Cel: WCAG 2.2 AA. Stan na 2026-10-04.

**Sprawdzone i działa**

- Audyt automatyczny (axe-core, reguły WCAG 2.0–2.2 A i AA): 0 naruszeń na stronie głównej, w widoku mieszkańca (także z otwartym formularzem zgłoszenia), w widoku planisty (z otwartym panelem miejsca, trasą kontroli, kolejką zgłoszeń i paskiem trybu demo) i na stronie próbki dla modelu.
- Pełna obsługa klawiaturą głównego scenariusza: wybór miejsca z rankingu, wpis kontroli, cofnięcie, powrót do listy, tryb demo (strzałki ← →). Link „Przejdź do treści”, widoczny wskaźnik fokusa, logiczna kolejność.
- Fokus nie ginie, gdy treść się zmienia: po wyborze miejsca przechodzi na nagłówek panelu, po zapisie kontroli na nagłówek formularza, po powrocie na nagłówek listy; w zgłoszeniu po dodaniu zdjęcia na „Usuń zdjęcie” (i z powrotem), w kolejce urzędu po decyzji na „Cofnij decyzję” (i z powrotem).
- Komunikaty dla czytnika ekranu: wynik zapisu kontroli, przeliczone trasy, krok trybu demo, dodanie i usunięcie zdjęcia, przyjęcie, odrzucenie i cofnięcie zgłoszenia.
- Wszystko z mapy jest też tekstem: ranking miejsc, legenda z liczbami, lista sprzecznych źródeł, opis trasy mieszkańca (z przyciskiem „Odczytaj na głos”), lista miejsc na trasie.
- Kategorie na mapie różnią się nie tylko kolorem, ale też grubością i przerywaniem linii.
- Zawijanie treści przy szerokości 320 px (powiększenie 400%) bez przewijania w poziomie.
- Ograniczenie ruchu w systemie wyłącza pulsowanie znacznika i animacje przelotu mapy.

**Wymaga pracy**

- Test z prawdziwym czytnikiem ekranu (VoiceOver, NVDA): sprawdziliśmy semantykę i komunikaty w kodzie i w przeglądarce, ale nie przeszliśmy scenariusza z czytnikiem.
- Pojedyncze odcinki na mapie nie są osiągalne klawiaturą. Tekstowo dostępne są miejsca z rankingu, sprzeczne źródła i odcinki tras; nie ma listy wszystkich odcinków nieprzejezdnych.
- Kontrast podkładu satelitarnego i linii na mapie nie jest mierzony automatycznie.
- Link do Leaflet w atrybucji mapy pochodzi z biblioteki; jego kontrast nie jest sprawdzany.

## Struktura

```
lib/aglosat/          model danych, statusy, profile, trasy, ranking, trasa kontroli, słownik
scripts/aglosat/      potok danych i kontrola reguł
components/aglosat/   widoki planisty i mieszkańca, mapa niewiedzy, tryb demo
data/aglosat/         wycinek OSM (wejście potoku)
public/aglosat/       pilot.json i wycinki ortofotomapy (dane aplikacji)
```

Frontend: Next.js 16, React 19, Tailwind 4, Leaflet.

## Źródła i licencje

- © współtwórcy OpenStreetMap, licencja ODbL.
- Ortofotomapa: Główny Urząd Geodezji i Kartografii, Geoportal (PZGiK, udostępniane bez opłat).
- Podkład mapy: Esri World Imagery.
