# AgloSat

**Przeszkody, których miasto nie ma na mapie.** AgloSat wskazuje miastu, które niewiadome o chodnikach sprawdzić najpierw, bo od nich zależy najwięcej dojść do usług.

Pilot: Nowa Huta, osiedla Wandy, Młodości i Na Skarpie (Kraków).

1. **Obraz z góry znajduje kandydatów.** Wycinki ortofotomapy pokazują miejsca, gdzie ciąg pieszy może być przerwany.
2. **Graf sieci pieszej nadaje im wagę.** Dla każdej niewiadomej liczymy, ile dojść z budynków mieszkalnych do przychodni, aptek, sklepów, poczty i bibliotek od niej zależy.
3. **Człowiek rozstrzyga w terenie.** Wynik kontroli zmienia status cechy, a trasy przeliczają się od razu.

## Uruchomienie

Wymagany Node.js 22.18 lub nowszy (skrypty potoku to TypeScript uruchamiany bezpośrednio przez Node).

```bash
npm install
npm run dev
```

Aplikacja: http://localhost:3000. Widoki: `/app/planista` (główny) i `/app/mieszkaniec`. Przycisk **Tryb demo** w prawym dolnym rogu prowadzi przez scenariusz prezentacji (strzałki ← → przełączają kroki).

Wszystkie dane demo są w repozytorium, więc aplikacja działa bez sieci, z wyjątkiem podkładu mapy (Esri World Imagery).

## Potok danych

```bash
npm run aglosat:fetch     # pobiera wycinek OSM do data/aglosat/osm-extract.json
npm run aglosat:build     # buduje public/aglosat/pilot.json: graf, dowody, ranking, mianownik
npm run aglosat:wycinki   # pobiera brakujące wycinki ortofotomapy do public/aglosat/wycinki/
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
| Klasy zwracane przez model wizyjny dla wycinków | **dane przykładowe**, oznaczone w interfejsie |
| Strefa zmian Sentinel-2 | **ilustracja**, jedna para scen, oznaczona w interfejsie |
| Kontrole w terenie | wpisywane w sesji; trwały zapis to krok po hackathonie |

**Model wizyjny.** Prototyp nie uruchamia modelu i nie potrzebuje klucza API. Graf, trasy, ranking i trasa kontroli działają bez żadnego modelu. Wycinki w `public/aglosat/wycinki/` są gotowym wejściem dla modelu: wynik klasyfikacji („ciągły / przerwany / niewidoczny” z oceną) wystarczy zapisać w obserwacjach w `pilot.json`.

## Reguły modelu danych

- Brak danych nigdy nie staje się „przejezdne”. Status cechy wynika z dowodów, a nie jest wpisywany.
- Data pobrania, data obrazu i data kontroli to osobne pola.
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

Cel: WCAG 2.2 AA. Stan na 2026-10-03.

**Sprawdzone i działa**

- Audyt automatyczny (axe-core, reguły WCAG 2.0–2.2 A i AA): 0 naruszeń na stronie głównej, w widoku mieszkańca i w widoku planisty, także z otwartym panelem miejsca, trasą kontroli i paskiem trybu demo.
- Pełna obsługa klawiaturą głównego scenariusza: wybór miejsca z rankingu, wpis kontroli, cofnięcie, powrót do listy, tryb demo (strzałki ← →). Link „Przejdź do treści”, widoczny wskaźnik fokusa, logiczna kolejność.
- Fokus nie ginie, gdy treść się zmienia: po wyborze miejsca przechodzi na nagłówek panelu, po zapisie kontroli na nagłówek formularza, po powrocie na nagłówek listy.
- Komunikaty dla czytnika ekranu: wynik zapisu kontroli, przeliczone trasy, krok trybu demo.
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
