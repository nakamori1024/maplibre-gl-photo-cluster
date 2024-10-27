export class PhotoCluster{
    constructor(photos=[]) {
        this.photos = photos;
    }

    addPhoto(photo) {
        let properties = {
            "icon": photo.icon,
            "picture": photo.picture
        };

        for (let key in photo.properties) {
            properties[key] = photo.properties[key];
        };

        this.photos.push({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': photo.coordinates
            },
            'properties': properties
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
            id: "invisible-points",
            type: 'circle',
            source: 'photos',
            filter: ['has', 'point_count'],
            paint: {
                'circle-opacity': 0.0,
            }
        });
    }

    addPhotoCluster = ({source=[], shape="square", popup=true, clickFunction=()=>{}}) => {
        this.map.on('load', async () => {
            this.addSource(source);
            this.addClusterLayer();

            const addMarker = () => this.addPhotoLayer(shape, popup, clickFunction);

            // Add marker with a delay to ensure it is properly displayed
            setTimeout(() => {
                addMarker();
            }, 100); // 100ms delay

            this.map.on("moveend", () => {
                addMarker();
            })
        });
    }

    addPhotoLayer = (shape, popup, clickFunction) => {
        this.removeCustomMarkers();

        const style = this.map.getStyle();

        const features = this.map.querySourceFeatures('photos');

        features.forEach(feature => {
            const el = document.createElement('div');
            
            el.className = 'marker';
            el.style.width = '50px';
            el.style.height = '50px';
            el.style.backgroundColor = '#fff';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid #fff';
            el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

            if (shape == "square") {
                el.style.borderRadius = '0';
            };

            if (feature.properties.cluster) {
                const clusterId = feature.properties.cluster_id;
                const pointCount = feature.properties.point_count;
                this.map.getSource('photos').getClusterLeaves(
                    clusterId,
                    Infinity, // All points in cluster
                    0, // Offset
                    (err, leaves) => {
                        if (err) {
                            console.error('Error retrieving cluster leaves:', err);
                            return;
                        }
                        // Use the 'icon' property of the first point in the cluster
                        const firstIcon = leaves[0]?.properties?.icon;
                        if (firstIcon) {
                            el.style.backgroundImage = `url(${firstIcon})`;
                        }

                        let minLng = Infinity, minLat = Infinity;
                        let maxLng = -Infinity, maxLat = -Infinity;

                        // Calculate the bounds of the cluster
                        leaves.forEach(leaf => {
                            const [lng, lat] = leaf.geometry.coordinates;
                            if (lng < minLng) minLng = lng;
                            if (lng > maxLng) maxLng = lng;
                            if (lat < minLat) minLat = lat;
                            if (lat > maxLat) maxLat = lat;
                        });

                        // 同一座標で重なっている場合
                        if (minLng == maxLng && minLat == maxLat) {
                            el.addEventListener("click", () => {
                                this.map.flyTo({center: [minLng, minLat], zoom: 17});

                                const onFlyEnd = () => {
                                    this.map.off('moveend', onFlyEnd);

                                    // 全てのマーカーを半透明にする
                                    this.setMarkersOpacity(0.5);

                                    // leavesの全ポイントのアイコンを表示する
                                    leaves.forEach(leaf => {
                                        const leafEl = document.createElement('div');
                                        leafEl.className = 'marker';
                                        leafEl.style.width = '50px';
                                        leafEl.style.height = '50px';
                                        leafEl.style.backgroundColor = '#fff';
                                        leafEl.style.backgroundSize = 'cover';
                                        leafEl.style.backgroundPosition = 'center';
                                        leafEl.style.borderRadius = '50%';
                                        leafEl.style.border = '2px solid #fff';
                                        leafEl.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
                                        leafEl.style.backgroundImage = `url(${leaf.properties.icon})`;
                                        leafEl.style.opacity = '1';

                                        if (shape == "square") {
                                            leafEl.style.borderRadius = '0';
                                        }

                                        let props = Object.assign({}, leaf.properties);
                                        delete props.icon;
                                        delete props.picture;
                                        let photoPoint = new PhotoPoint(leaf.geometry.coordinates, leaf.properties.icon, leaf.properties.picture, props);

                                        leafEl.addEventListener("click", () => clickFunction(photoPoint));

                                        const leafMarker = new maplibregl.Marker({element: leafEl});

                                        // 位置をずらして表示する
                                        const lngLat = this.distributeAroundPoint(leaf.geometry.coordinates, leaves.indexOf(leaf), leaves.length);
                                        leafMarker.setLngLat(lngLat);

                                        if (popup) {
                                            leafMarker.setPopup(
                                                new maplibregl.Popup({ offset: 25 })
                                                    .setHTML(`
                                                        <div class="popup-content">
                                                            <img src="${leaf.properties.picture}" class="popup-image" style="width: 200px; height: auto;" />
                                                            <p class="popup-caption">${leaf.properties.caption}</p>
                                                        </div>
                                                    `)
                                            );
                                        }
                                        leafMarker.addTo(this.map);
                                        this.markers.push(leafMarker);
                                    });
                                }
                                // 'moveend' イベントをリッスンして、アニメーション完了後に処理を実行
                                this.map.on('moveend', onFlyEnd);
                            });
                        } else {
                            el.addEventListener("click", () => {
                                this.map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 100 })});
                        };
                    }
                );

                const badge = document.createElement('div');
                badge.className = 'badge';
                badge.textContent = pointCount;
                badge.style.width = '20px';
                badge.style.height = '20px';
                badge.style.backgroundColor = '#fff';
                badge.style.color = '#000';
                badge.style.opacity = '0.8';
                badge.style.borderRadius = '50%';
                badge.style.display = 'flex';
                badge.style.justifyContent = 'center';
                badge.style.border = '2px solid #fff';
                badge.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
                badge.style.marginLeft = '-7px';
                badge.style.marginTop = '-7px';

                el.appendChild(badge);
            } else {
                el.style.backgroundImage = `url(${feature.properties.icon})`;

                let props = Object.assign({}, feature.properties);
                delete props.icon;
                delete props.picture;
                let photoPoint = new PhotoPoint(feature.geometry.coordinates, feature.properties.icon, feature.properties.picture, props);

                el.addEventListener("click", () => clickFunction(photoPoint));
            }

            const marker = new maplibregl.Marker({element: el});

            marker.setLngLat(feature.geometry.coordinates);

            if (popup && !feature.properties.cluster) {
                marker.setPopup(
                    new maplibregl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="popup-content">
                                <img src="${feature.properties.picture}" class="popup-image" style="width: 200px; height: auto;" />
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
            clusterMaxZoom: 18,
            clusterRadius: 50
        });
    }

    distributeAroundPoint = (center, index, length, radius = 0.0002) => {
        // ずらす角度
        const offsetAngle = 360 / length;

        // 配置する角度
        const angle = (index * offsetAngle) * (Math.PI / 180);

        return [
            center[0] + radius * Math.cos(angle),
            center[1] + radius * Math.sin(angle)
        ];
    };

    removeCustomMarkers() {
        if (this.markers) {
            this.markers.forEach(marker => marker.remove());
            this.markers = [];
        }
    }

    setMarkersOpacity(opacity) {
        this.markers.forEach(marker => {
            const element = marker.getElement();
            element.style.opacity = opacity;
        });
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
        return this.properties;
    }
}
