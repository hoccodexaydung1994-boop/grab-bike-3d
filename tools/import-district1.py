#!/usr/bin/env python3
"""Convert an OpenStreetMap XML extract into the game's District 1 map.

Source: https://api.openstreetmap.org/api/0.6/map?bbox=106.702,10.777,106.710,10.785
Data © OpenStreetMap contributors, ODbL. See https://www.openstreetmap.org/copyright.
"""
import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import re
import random
import xml.etree.ElementTree as ET


LAT, LON = 10.780647, 106.704836
EXTENT = (106.7025, 10.7786, 106.7079, 10.7828)
ROAD_TYPES = {
    'primary': (1, 14), 'primary_link': (2, 8), 'secondary': (2, 11),
    'secondary_link': (3, 7), 'tertiary': (3, 9), 'residential': (4, 7),
    'living_street': (4, 5), 'service': (5, 4.2), 'pedestrian': (6, 3),
    'footway': (6, 2), 'path': (6, 2), 'steps': (6, 1.7),
}
POIS = {
    'restaurant', 'cafe', 'fast_food', 'bakery', 'ice_cream', 'food_court',
    'bar', 'pub', 'convenience', 'supermarket', 'motorcycle', 'bicycle',
    'pharmacy', 'hospital', 'clinic', 'fuel', 'motorcycle_parking',
}


def tags(element):
    return {tag.get('k'): tag.get('v') for tag in element.findall('tag')}


def project(lat, lon):
    return (
        round((lon - LON) * 111320 * math.cos(math.radians(LAT)), 2),
        round((LAT - lat) * 111320, 2),
    )


def inside(point, bounds):
    x, z = point
    return bounds[0] <= x <= bounds[2] and bounds[1] <= z <= bounds[3]


def runs(refs, nodes, bounds):
    """Split ways at the edge of the extract while retaining their original nodes."""
    chunk = []
    for ref in refs:
        if ref in nodes and inside(nodes[ref], bounds):
            if not chunk or ref != chunk[-1]:
                chunk.append(ref)
        else:
            if len(chunk) > 1:
                yield chunk
            chunk = []
    if len(chunk) > 1:
        yield chunk


def flatten(points):
    return [coordinate for point in points for coordinate in point]


def position(points):
    return tuple(round(sum(column) / len(points), 2) for column in zip(*points))


def distance(points):
    return round(sum(math.dist(a, b) for a, b in zip(points, points[1:])), 2)


def number(text, default):
    match = re.match(r'^\d+(?:[.,]\d+)?', text or '')
    return float(match[0].replace(',', '.')) if match else default


def clean_name(name):
    return re.sub(r"[<>&'\"\x00-\x1f]", '', name or '').strip()[:100]


def import_map(path):
    raw = ET.parse(path).getroot()
    x0, z0 = project(EXTENT[3], EXTENT[0])
    x1, z1 = project(EXTENT[1], EXTENT[2])
    bounds = [x0, z0, x1, z1]
    nodes = {}
    map_data = {key: [] for key in (
        'names', 'roads', 'deck', 'gnodes', 'edges', 'buildings', 'water',
        'waterLines', 'green', 'pitch', 'wetland', 'trees', 'signals', 'fuel',
        'hospitals', 'bus', 'pois', 'fill', 'storefronts', 'parking',
    )}
    map_data.update(district='q1', bounds=bounds, origin=[LAT, LON], spawn=[-31.63, 26.03])
    names = {}
    road_runs = []
    signals = set()

    def name_index(name):
        name = clean_name(name)
        if not name:
            return -1
        if name not in names:
            names[name] = len(map_data['names'])
            map_data['names'].append(name)
        return names[name]

    def add_point(point, attrs):
        if attrs.get('natural') == 'tree':
            map_data['trees'].extend(point)
        highway = attrs.get('highway')
        if highway == 'traffic_signals':
            signals.add(point)
        if highway == 'bus_stop':
            map_data['bus'].extend(point)
        kind = attrs.get('amenity') or attrs.get('shop')
        if kind == 'fuel':
            map_data['fuel'].extend(point)
        if kind == 'motorcycle_parking':
            map_data['parking'].append(list(point))
        name = clean_name(attrs.get('name'))
        if kind in ('hospital', 'clinic'):
            map_data['hospitals'].append(dict(t=name or 'Phòng khám', x=point[0], z=point[1]))
        if name and kind in POIS:
            map_data['pois'].append(dict(t=name, x=point[0], z=point[1], k=kind))

    for e in raw.findall('node'):
        p = project(float(e.get('lat')), float(e.get('lon')))
        nodes[e.get('id')] = p
        if inside(p, bounds):
            add_point(p, tags(e))

    for w in raw.findall('way'):
        attrs = tags(w)
        refs = [nd.get('ref') for nd in w.findall('nd')]
        highway = attrs.get('highway')
        if (highway in ROAD_TYPES and attrs.get('area') != 'yes'
                and attrs.get('tunnel') not in ('yes', 'building_passage')):
            road_class, width = ROAD_TYPES[highway]
            if attrs.get('service') == 'alley':
                width = 3.1
            width = min(20, max(1.5, number(attrs.get('width'), width)))
            direction = int(attrs.get('oneway') in ('yes', '1', '-1')
                            or attrs.get('junction') == 'roundabout')
            if attrs.get('oneway') == '-1':
                refs.reverse()
            n = name_index(attrs.get('name'))
            for ref_run in runs(refs, nodes, bounds):
                points = [nodes[ref] for ref in ref_run]
                if distance(points) < 2:
                    continue
                r = dict(c=road_class, w=width, o=direction, n=n,
                         b=int(attrs.get('bridge') == 'yes'), p=flatten(points))
                map_data['roads'].append(r)
                if road_class < 6 and attrs.get('access') not in ('private', 'no'):
                    road_runs.append((ref_run, r))
        if len(refs) < 4 or refs[0] != refs[-1] or any(ref not in nodes for ref in refs):
            continue
        points = [nodes[ref] for ref in refs[:-1]]
        if not all(inside(p, bounds) for p in points):
            continue
        p = flatten(points)
        center = position(points)
        add_point(center, attrs)
        if attrs.get('building') not in (None, 'no', 'roof', 'construction'):
            area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:] + points[:1]))) / 2
            if area < 5:
                continue
            hotel = attrs.get('tourism') == 'hotel'
            levels = number(attrs.get('building:levels'), 6 if hotel else 3.5 if area > 90 else 2.8)
            h = round(min(150, max(3.5, number(attrs.get('height'), levels * 3.35))), 1)
            b = dict(h=h, p=p)
            if attrs.get('name'):
                b['n'] = name_index(attrs['name'])
            map_data['buildings'].append(b)
        elif attrs.get('natural') == 'water':
            map_data['water'].append(p)
        elif attrs.get('leisure') == 'pitch':
            map_data['pitch'].append(p)
        elif attrs.get('leisure') in ('park', 'garden') or attrs.get('landuse') == 'grass':
            map_data['green'].append(p)

    # Retain real OSM intersections and split the navigation graph only at shared nodes.
    intersections = Counter(ref for refs, _ in road_runs for ref in set(refs))
    graph_ids = {}
    for refs, road in road_runs:
        start = 0
        for end in range(1, len(refs)):
            if end != len(refs) - 1 and intersections[refs[end]] == 1 and refs[end] != refs[0]:
                continue
            points = [nodes[ref] for ref in refs[start:end + 1]]
            end_refs = refs[start], refs[end]
            start = end
            length = distance(points)
            if length < 0.2:
                continue
            for ref in end_refs:
                if ref not in graph_ids:
                    graph_ids[ref] = len(graph_ids)
                    map_data['gnodes'].extend(nodes[ref])
            a, b = [graph_ids[ref] for ref in end_refs]
            map_data['edges'].append(dict(a=a, b=b, p=flatten(points), L=length,
                                         **{key: road[key] for key in ('w', 'o', 'n', 'c')}))

    # Only use the main connected component for missions and moving traffic.
    neighbors = defaultdict(set)
    for e in map_data['edges']:
        neighbors[e['a']].add(e['b'])
        neighbors[e['b']].add(e['a'])
    pending = set(neighbors)
    parts = []
    while pending:
        stack = [min(pending)]
        found = set()
        while stack:
            node = stack.pop()
            if node in found:
                continue
            found.add(node)
            stack.extend(neighbors[node] - found)
        parts.append(found)
        pending -= found
    main = max(parts, key=len)
    ids = {k: i for i, k in enumerate(sorted(main))}
    gnodes = map_data['gnodes']
    map_data['gnodes'] = flatten([gnodes[k * 2:k * 2 + 2] for k in ids])
    map_data['edges'] = [dict(e, a=ids[e['a']], b=ids[e['b']])
                         for e in map_data['edges'] if e['a'] in main]
    map_data['signals'] = flatten(sorted(signals))
    map_data['pois'].sort(key=lambda poi: (poi['t'], poi['x'], poi['z']))
    add_gameplay_details(map_data)
    return map_data


def add_gameplay_details(data):
    """Add labeled fictional services and storefronts where the source is sparse."""
    rng = random.Random(15015)
    road_segments = []
    for road in data['roads']:
        points = list(zip(road['p'][::2], road['p'][1::2]))
        for a, b in zip(points, points[1:]):
            if a != b:
                road_segments.append((a, b, road))
    blocks = [box(b['p']) for b in data['buildings']]
    parks = [box(p) for p in data['green']]
    signs = [
        ['CƠM NHÀ', 'Bếp Việt'], ['ラーメン', 'Ramen'], ['CÀ PHÊ', 'Cà phê phố'],
        ['居酒屋', 'Izakaya'], ['BÁNH MÌ', 'Bếp nhỏ'], ['焼き鳥', 'Yakitori'],
        ['TRÀ SEN', 'Quán trà'], ['うどん', 'Udon'], ['CỬA HÀNG', 'Tạp hóa'],
    ]
    frontages = {
        'Lê Thánh Tôn', 'Hẻm 15B Lê Thánh Tôn', 'Hẻm 15A Đường Lê Thánh Tôn',
        'Thái Văn Lung', 'Ngô Văn Năm', 'Tôn Đức Thắng', 'Lý Tự Trọng',
        'Thi Sách', 'Hai Bà Trưng', 'Đông Du',
    }
    # Services are invented for gameplay. Reserve their footprints first so
    # generated row houses cannot cover the pump or garage access.
    service_sites = []
    for a, b, road in road_segments:
        length = math.dist(a, b)
        if road['c'] not in (3, 4) or length < 30:
            continue
        mid = position([a, b])
        for side in (-1, 1):
            offset = (road['w'] / 2 + 9) * side / length
            p = mid[0] - (b[1] - a[1]) * offset, mid[1] + (b[0] - a[0]) * offset
            area = (p[0] - 6, p[1] - 5, p[0] + 6, p[1] + 5)
            if not inside((area[0], area[1]), data['bounds']) or not inside((area[2], area[3]), data['bounds']):
                continue
            if any(overlap(area, occupied) for occupied in (*blocks, *parks)):
                continue
            if any(point_segment_distance(p, q, r) < lane['w'] / 2 + 7 for q, r, lane in road_segments):
                continue
            if math.dist(p, data['spawn']) > 60:
                service_sites.append((math.dist(p, data['spawn']), p, area))
    service_sites.sort()
    if not data['fuel']:
        _, pump, area = service_sites[0]
        data['fuel'].extend(round(v, 2) for v in pump)
        blocks.append(area)
    if not any(p['k'] in ('motorcycle', 'bicycle') for p in data['pois']):
        _, garage, area = next(s for s in service_sites if not any(overlap(s[2], b) for b in blocks))
        data['pois'].append(dict(t='Garage Phố Nhỏ (trong game)', x=round(garage[0], 2), z=round(garage[1], 2), k='motorcycle'))
        blocks.append(area)

    parking = []
    for a, b, road in road_segments:
        name = data['names'][road['n']] if road['n'] >= 0 else ''
        length = math.dist(a, b)
        if name not in frontages or road['c'] > 5 or length < 14:
            continue
        ux, uz = (b[0] - a[0]) / length, (b[1] - a[1]) / length
        for side in (-1, 1):
            nx, nz = -side * uz, side * ux
            for along in range(10, int(length) - 6, 9):
                width, depth = rng.uniform(5.6, 7.8), rng.uniform(7.5, 11.0)
                y = road['w'] / 2 + (1.9 if road['c'] == 5 else 2.5)
                front = a[0] + along * ux + y * nx, a[1] + along * uz + y * nz
                cx, cz = front[0] + nx * depth / 2, front[1] + nz * depth / 2
                corners = [(cx + wx * ux + dz * nx, cz + wx * uz + dz * nz)
                           for wx in (-width / 2, width / 2) for dz in (-depth / 2, depth / 2)]
                footprint = box(flatten(corners))
                if not all(inside(p, data['bounds']) for p in corners):
                    continue
                if any(overlap(footprint, occupied) for occupied in (*blocks, *parks)):
                    continue
                # Along all streets, reserve carriageway and pedestrian access. Testing
                # a grid prevents a short crossing from slipping between edge samples.
                probes = [(cx + wx * ux + dz * nx, cz + wx * uz + dz * nz)
                          for wx in (-width / 2, 0, width / 2) for dz in (-depth / 2, 0, depth / 2)]
                if any(point_segment_distance(p, q, r) < lane['w'] / 2 + 1.5
                       for p in probes for q, r, lane in road_segments
                       if abs(q[0] - cx) < 100 or abs(r[0] - cx) < 100):
                    continue
                h = round(rng.choice((2, 3, 3, 4, 4, 5)) * 3.3, 2)
                data['fill'].extend([round(v, 3) for v in (cx, cz, math.atan2(uz, ux), width, depth, h)])
                blocks.append(footprint)
                label = rng.choice(signs)
                heading = math.atan2(-nx, -nz)
                data['storefronts'].append(dict(
                    x=round(front[0] - nx * 0.04, 2), z=round(front[1] - nz * 0.04, 2),
                    heading=round(heading, 4), label=label, width=round(width, 2)))
                curb = (front[0] - nx * 0.95, front[1] - nz * 0.95)
                if all(math.dist(curb, p) > 15 for p in parking):
                    data['parking'].append([round(curb[0], 2), round(curb[1], 2), round(heading + 0.45, 4)])
                    parking.append(curb)


def box(p):
    return min(p[::2]), min(p[1::2]), max(p[::2]), max(p[1::2])


def overlap(a, b):
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


def point_segment_distance(p, a, b):
    vx, vz = b[0] - a[0], b[1] - a[1]
    d = vx * vx + vz * vz
    t = max(0, min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / d))
    return math.dist(p, (a[0] + t * vx, a[1] + t * vz))



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('osm_file', type=Path)
    parser.add_argument('output_json', type=Path)
    args = parser.parse_args()
    data = import_map(args.osm_file)
    args.output_json.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
