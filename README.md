# maplibre-gl-photo-cluster
This module enables the use of custom markers with clustering support in MapLibre.

## Usage
### Use modules
```
import { PhotoPoint, PhotoCluster, PhotoExtension } from '../src/maplibre-gl-photo-cluster.js';
```

### Example
```js
    <script type="module">
        import { PhotoPoint, PhotoCluster, PhotoExtension } from '../src/maplibre-gl-photo-cluster.js';

        const map = new maplibregl.Map({
            container: 'map',
            style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
            center: [139.767, 35.681],
            zoom: 12
        });

        // Add extention
        new PhotoExtension(map);

        // Create photo points
        const photo1 = new PhotoPoint([139.767, 35.681], 'https://xxx.png');
        const photo2 = new PhotoPoint([139.7000, 35.6900],'https://yyy.png');

        // Add properties
        photo1.addProperties("caption", "name1");
        photo2.addProperties("caption", "name2");

        // Create photo cluster
        const photos = new PhotoCluster();
        photos.addPhoto(photo1);
        photos.addPhoto(photo2);

        map.on('load', () => {
            // Add photo cluster
            map.addPhotoCluster({
                source: photos, // PhotoCluster object
                shape: "square", // square or circle
                popup: true, // true or false
                clickFunction: testFunction // function for click event
            });
        });

        // Example function
        function testFunction() {
            console.log("test");
        }
    </script>
```

## Supported Versions
MapLibre v1.14.0 ~ v4.5.2

## License
MIT License

Copyright (c) 2024 nakamori1024
