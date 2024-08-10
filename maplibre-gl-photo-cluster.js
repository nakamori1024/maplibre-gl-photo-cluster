export class PhotoCluster{
    constructor(photos=[]) {
        this.photos = photos;
    }

    addPhoto(photo) {
        this.photos.push({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': photo.coordinates
            },
            'properties': {
                "icon": photo.icon,
                "picture": photo.picture,
                "caption": photo.properties.caption
            }
        });
    }
}

export class PhotoExtension {
    constructor(map) {
        this.map = map;
        this.markers = [];

        map.addPhotoCluster = (properties) => this.addPhotoCluster(properties);
    }

    addClusterLayer = () => {
        this.map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'photos',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100,
                    '#f1f075',
                    750,
                    '#f28cb1'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40
                ]
            }
        });

        this.map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'photos',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });
    }

    addPhotoCluster = ({source=[], shape="square", popup=true, clickFunction=()=>{}}) => {
        this.map.on('load', async () => {
            this.addSource(source);
            this.addClusterLayer();

            const addMarker = () => this.addPhotoLayer(shape, popup, clickFunction);
            this.map.on("render", addMarker);

            this.map.on("click", () => {
                this.map.off("render", addMarker);
            })

            this.map.on("move", () => {
                this.map.off("render", addMarker);
                addMarker();
            })
        });
    }

    addPhotoLayer = (shape, popup, clickFunction) => {
        this.removeCustomMarkers();

        const style = this.map.getStyle();

        const features = this.map.querySourceFeatures('photos', {
            filter: ['!', ['has', 'point_count']]
        });

        features.forEach(feature => {
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = `url(${feature.properties.icon})`;
            el.style.width = '50px';
            el.style.height = '50px';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid #fff';
            el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

            if (shape == "square") {
                el.style.borderRadius = '0';
            };

            el.addEventListener("click", clickFunction);

            const marker = new maplibregl.Marker(el);

            marker.setLngLat(feature.geometry.coordinates);

            if (popup) {
                marker.setPopup(
                    new maplibregl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="popup-content">
                                <img src="${feature.properties.picture}" class="popup-image" />
                                <p class="popup-caption">${feature.properties.caption}</p>
                            </div>
                        `)
                );
            }

            marker.addTo(this.map);

            this.markers.push(marker);
        });
    }

    addSource = (source) => {
        this.map.addSource('photos', {
            type: 'geojson',            
            data: {
                "type": "FeatureCollection",
                "features":source.photos
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });
    }

    removeCustomMarkers() {
        if (this.markers) {
            this.markers.forEach(marker => marker.remove());
            this.markers = [];
        }
    }
}

export class PhotoPoint {
    constructor(coordinates, icon, picture=icon, properties={}) {
        this.coordinates = coordinates;
        this.icon = icon;
        this.picture = picture;
        this.properties = properties;
    }

    addProperties(key, value) {
        this.properties[key] = value;
    }

    getProperties() {
        console.log(this.properties);
        return this.properties;
    }
}
