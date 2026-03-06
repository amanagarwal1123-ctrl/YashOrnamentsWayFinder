"""Seed data for Chandni Chowk Navigation App"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid

load_dotenv(Path(__file__).parent / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'test_database')

def gen_id():
    return str(uuid.uuid4())

def now():
    return datetime.now(timezone.utc)

async def seed():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing data
    collections = ['businesses', 'qr_sources', 'routes', 'checkpoints', 
                   'sessions', 'session_events', 'callback_requests',
                   'helpdesk_cases', 'helpdesk_case_updates', 'users',
                   'otp_codes', 'gold_rates', 'gallery_items', 'audit_logs',
                   'push_subscriptions']
    for col in collections:
        await db[col].delete_many({})
    
    # ---- Businesses ----
    ajpl_id = gen_id()
    yash_id = gen_id()
    
    businesses = [
        {
            'id': ajpl_id,
            'name': 'AJPL',
            'slug': 'ajpl',
            'full_name': 'AJPL \u2013 Aman Jewellery Pvt Ltd',
            'description': 'Premium retail jewellery destination',
            'brand_type': 'retail',
            'destination_label': 'AJPL \u2013 Aman Jewellery Pvt Ltd',
            'accent_color': '#C8A24A',
            'feature_flags': ['gold-rate-widget', 'design-gallery', 'rate-calculator'],
            'contact_phone': '+91-11-23456789',
            'contact_whatsapp': '+919876543210',
            'address': '1159/1114, Yash Complex, Kucha Mahajani, Chandni Chowk, Delhi 110006',
            'active': True,
            'created_at': now().isoformat()
        },
        {
            'id': yash_id,
            'name': 'Yash Ornaments',
            'slug': 'yash',
            'full_name': 'Yash Ornaments',
            'description': 'Wholesale jewellery supplier',
            'brand_type': 'wholesale',
            'destination_label': 'Yash Ornaments',
            'accent_color': '#1E5EFF',
            'feature_flags': [],
            'contact_phone': '+91-11-23456790',
            'contact_whatsapp': '+919876543211',
            'address': '1159/1114, Yash Complex, Kucha Mahajani, Chandni Chowk, Delhi 110006',
            'active': True,
            'created_at': now().isoformat()
        }
    ]
    await db.businesses.insert_many(businesses)
    print(f'Seeded {len(businesses)} businesses')
    
    # ---- QR Sources ----
    qr_sources = [
        {'id': gen_id(), 'code': 'AJPL-DEFAULT', 'business_id': ajpl_id, 'campaign': 'walk-in', 'description': 'Main AJPL QR', 'active': True, 'scan_count': 0, 'created_at': now().isoformat()},
        {'id': gen_id(), 'code': 'AJPL-METRO', 'business_id': ajpl_id, 'campaign': 'metro-promo', 'description': 'AJPL Metro campaign', 'active': True, 'scan_count': 0, 'created_at': now().isoformat()},
        {'id': gen_id(), 'code': 'YASH-DEFAULT', 'business_id': yash_id, 'campaign': 'walk-in', 'description': 'Main Yash QR', 'active': True, 'scan_count': 0, 'created_at': now().isoformat()},
        {'id': gen_id(), 'code': 'YASH-WHOLESALE', 'business_id': yash_id, 'campaign': 'wholesale-invite', 'description': 'Yash wholesale QR', 'active': True, 'scan_count': 0, 'created_at': now().isoformat()},
    ]
    await db.qr_sources.insert_many(qr_sources)
    print(f'Seeded {len(qr_sources)} QR sources')
    
    # ---- Routes ----
    route_metro = gen_id()
    route_red_fort = gen_id()
    route_omaxe = gen_id()
    route_town_hall = gen_id()
    route_building = gen_id()
    
    routes = [
        {'id': route_metro, 'name': 'From Metro Gate 5', 'description': 'Walk from Chandni Chowk Metro Station Gate 5 through the market', 'start_type': 'metro', 'start_label': 'Chandni Chowk Metro - Gate 5', 'difficulty': 'easy', 'estimated_time_minutes': 12, 'checkpoint_count': 6, 'status': 'published', 'created_by': 'system', 'created_at': now().isoformat(), 'updated_at': now().isoformat()},
        {'id': route_red_fort, 'name': 'From Red Fort Side', 'description': 'Walk from Red Fort / Jama Masjid side through the old lanes', 'start_type': 'red_fort', 'start_label': 'Red Fort / Jama Masjid Gate', 'difficulty': 'moderate', 'estimated_time_minutes': 18, 'checkpoint_count': 7, 'status': 'published', 'created_by': 'system', 'created_at': now().isoformat(), 'updated_at': now().isoformat()},
        {'id': route_omaxe, 'name': 'From Omaxe Mall', 'description': 'Walk from Omaxe Chowk Mall entrance towards Kucha Mahajani', 'start_type': 'omaxe', 'start_label': 'Omaxe Chowk Mall Entrance', 'difficulty': 'easy', 'estimated_time_minutes': 10, 'checkpoint_count': 5, 'status': 'published', 'created_by': 'system', 'created_at': now().isoformat(), 'updated_at': now().isoformat()},
        {'id': route_town_hall, 'name': 'From Town Hall', 'description': 'Walk from Town Hall Metro / Delhi Town Hall side', 'start_type': 'town_hall', 'start_label': 'Delhi Town Hall', 'difficulty': 'moderate', 'estimated_time_minutes': 15, 'checkpoint_count': 6, 'status': 'published', 'created_by': 'system', 'created_at': now().isoformat(), 'updated_at': now().isoformat()},
        {'id': route_building, 'name': 'From Building Entrance', 'description': 'Already at Yash Complex? Navigate to the correct floor', 'start_type': 'building_entrance', 'start_label': 'Yash Complex Building Gate', 'difficulty': 'easy', 'estimated_time_minutes': 3, 'checkpoint_count': 3, 'status': 'published', 'created_by': 'system', 'created_at': now().isoformat(), 'updated_at': now().isoformat()},
    ]
    await db.routes.insert_many(routes)
    print(f'Seeded {len(routes)} routes')
    
    # ---- Checkpoints ----
    checkpoints = []
    
    # Metro Route checkpoints
    metro_cps = [
        {'route_id': route_metro, 'order': 1, 'name': 'Metro Gate 5 Exit', 'short_instruction': 'Exit from Gate 5 of Chandni Chowk Metro Station', 'long_instruction': 'Come out of Gate 5. You will see Chandni Chowk main road ahead.', 'landmark_description': 'Metro station pillars with Gate 5 sign', 'what_to_look_for': 'Yellow Gate 5 sign above the exit', 'direction': 'straight', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Exit Metro Gate 5, face the main road', 'heading': 180.0, 'lat': 28.6562, 'lng': 77.2301},
        {'route_id': route_metro, 'order': 2, 'name': 'Chandni Chowk Main Road', 'short_instruction': 'Walk along the main road towards Fatehpuri side', 'long_instruction': 'Turn right on the main road. Walk about 100 meters. Look for silver jewelry shops.', 'landmark_description': 'Wide road with many shops on both sides', 'what_to_look_for': 'Silver jewelry shops and sweet shops', 'direction': 'right', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Turn right on main road, walk 100m', 'heading': 270.0, 'lat': 28.6558, 'lng': 77.2285},
        {'route_id': route_metro, 'order': 3, 'name': 'Kucha Mahajani Lane Entry', 'short_instruction': 'Turn left into the narrow lane', 'long_instruction': 'Look for a narrow lane on your left. There is a "Kucha Mahajani" signboard above.', 'landmark_description': 'Narrow lane entrance with old signboard', 'what_to_look_for': 'Kucha Mahajani signboard, narrow lane entry', 'direction': 'left', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Turn left into Kucha Mahajani lane', 'heading': 180.0, 'lat': 28.6555, 'lng': 77.2278},
        {'route_id': route_metro, 'order': 4, 'name': 'Silver Market Lane', 'short_instruction': 'Walk straight through the silver market', 'long_instruction': 'Keep walking straight. You will pass many silver shops. Do not turn anywhere.', 'landmark_description': 'Many silver jewelry shops on both sides', 'what_to_look_for': 'Silver shops, keep walking straight', 'direction': 'straight', 'indoor': False, 'is_critical': False, 'risk_level': 'medium', 'fallback_text': 'Walk straight through silver market, dont turn', 'heading': 180.0, 'lat': 28.6550, 'lng': 77.2275},
        {'route_id': route_metro, 'order': 5, 'name': 'Yash Complex Entrance', 'short_instruction': 'Enter the Yash Complex building', 'long_instruction': 'Look for a building with "Yash Complex" written. It is the SECOND similar building. Enter the main gate.', 'landmark_description': 'Multi-story building with Yash Complex sign', 'what_to_look_for': 'Yash Complex signboard on building, SECOND building not first', 'direction': 'enter', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Enter Yash Complex building (2nd similar building)', 'heading': 90.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_metro, 'order': 6, 'name': '5th Floor - Destination', 'short_instruction': 'Take stairs or lift to 5th floor', 'long_instruction': 'Use the stairs or lift inside. Go to the 5th floor. The office is on the left after exiting the lift.', 'landmark_description': 'Stairs and lift inside the building lobby', 'what_to_look_for': 'Lift or staircase, go to 5th floor', 'direction': 'climb', 'indoor': True, 'floor_context': '5th Floor', 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Go to 5th floor using stairs/lift', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
    ]
    
    # Red Fort Route checkpoints
    red_fort_cps = [
        {'route_id': route_red_fort, 'order': 1, 'name': 'Red Fort Main Gate', 'short_instruction': 'Start from Red Fort ticket counter area', 'direction': 'straight', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Start from Red Fort, walk towards Chandni Chowk', 'heading': 270.0, 'lat': 28.6562, 'lng': 77.2410},
        {'route_id': route_red_fort, 'order': 2, 'name': 'Netaji Subhash Marg', 'short_instruction': 'Walk towards Chandni Chowk on the main road', 'direction': 'straight', 'indoor': False, 'is_critical': False, 'risk_level': 'low', 'fallback_text': 'Follow Netaji Subhash Marg westward', 'heading': 270.0, 'lat': 28.6558, 'lng': 77.2380},
        {'route_id': route_red_fort, 'order': 3, 'name': 'Dariba Kalan Entry', 'short_instruction': 'Enter Dariba Kalan - the famous jewelry market lane', 'direction': 'right', 'indoor': False, 'is_critical': True, 'risk_level': 'medium', 'fallback_text': 'Turn right into Dariba Kalan jewelry lane', 'heading': 0.0, 'lat': 28.6556, 'lng': 77.2340},
        {'route_id': route_red_fort, 'order': 4, 'name': 'Cross Kinari Bazaar', 'short_instruction': 'Cross the wedding decoration market area', 'direction': 'straight', 'indoor': False, 'is_critical': False, 'risk_level': 'medium', 'fallback_text': 'Walk past Kinari Bazaar, keep going', 'heading': 270.0, 'lat': 28.6553, 'lng': 77.2310},
        {'route_id': route_red_fort, 'order': 5, 'name': 'Kucha Mahajani Connection', 'short_instruction': 'Take the connecting lane to Kucha Mahajani', 'direction': 'left', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Turn left towards Kucha Mahajani', 'heading': 180.0, 'lat': 28.6550, 'lng': 77.2280},
        {'route_id': route_red_fort, 'order': 6, 'name': 'Yash Complex Entrance', 'short_instruction': 'Enter the Yash Complex building (SECOND similar building)', 'direction': 'enter', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Enter Yash Complex (2nd building)', 'heading': 90.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_red_fort, 'order': 7, 'name': '5th Floor - Destination', 'short_instruction': 'Take stairs or lift to 5th floor', 'direction': 'climb', 'indoor': True, 'floor_context': '5th Floor', 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Go to 5th floor', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
    ]
    
    # Omaxe Route
    omaxe_cps = [
        {'route_id': route_omaxe, 'order': 1, 'name': 'Omaxe Chowk Mall Exit', 'short_instruction': 'Exit Omaxe Mall from main gate', 'direction': 'straight', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Exit Omaxe Mall main gate', 'heading': 0.0, 'lat': 28.6548, 'lng': 77.2260},
        {'route_id': route_omaxe, 'order': 2, 'name': 'Market Road', 'short_instruction': 'Walk towards Kucha Mahajani market area', 'direction': 'right', 'indoor': False, 'is_critical': False, 'risk_level': 'low', 'fallback_text': 'Turn right towards the market', 'heading': 90.0, 'lat': 28.6550, 'lng': 77.2268},
        {'route_id': route_omaxe, 'order': 3, 'name': 'Kucha Mahajani From South', 'short_instruction': 'Enter Kucha Mahajani from the south side', 'direction': 'left', 'indoor': False, 'is_critical': True, 'risk_level': 'medium', 'fallback_text': 'Turn left into Kucha Mahajani', 'heading': 0.0, 'lat': 28.6548, 'lng': 77.2275},
        {'route_id': route_omaxe, 'order': 4, 'name': 'Yash Complex Entrance', 'short_instruction': 'Enter the Yash Complex building', 'direction': 'enter', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Enter Yash Complex (2nd building)', 'heading': 90.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_omaxe, 'order': 5, 'name': '5th Floor - Destination', 'short_instruction': 'Take stairs or lift to 5th floor', 'direction': 'climb', 'indoor': True, 'floor_context': '5th Floor', 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Go to 5th floor', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
    ]
    
    # Town Hall Route
    town_hall_cps = [
        {'route_id': route_town_hall, 'order': 1, 'name': 'Town Hall Metro Exit', 'short_instruction': 'Exit from Town Hall Metro station', 'direction': 'straight', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Exit Town Hall Metro', 'heading': 90.0, 'lat': 28.6540, 'lng': 77.2250},
        {'route_id': route_town_hall, 'order': 2, 'name': 'Nai Sarak Road', 'short_instruction': 'Walk along Nai Sarak towards Chandni Chowk', 'direction': 'straight', 'indoor': False, 'is_critical': False, 'risk_level': 'low', 'fallback_text': 'Walk along Nai Sarak road', 'heading': 0.0, 'lat': 28.6545, 'lng': 77.2260},
        {'route_id': route_town_hall, 'order': 3, 'name': 'Book Market Area', 'short_instruction': 'Pass through the book market area', 'direction': 'straight', 'indoor': False, 'is_critical': False, 'risk_level': 'low', 'fallback_text': 'Walk through book market', 'heading': 0.0, 'lat': 28.6548, 'lng': 77.2268},
        {'route_id': route_town_hall, 'order': 4, 'name': 'Kucha Mahajani Turn', 'short_instruction': 'Turn right into Kucha Mahajani', 'direction': 'right', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Turn right into Kucha Mahajani', 'heading': 90.0, 'lat': 28.6550, 'lng': 77.2275},
        {'route_id': route_town_hall, 'order': 5, 'name': 'Yash Complex Entrance', 'short_instruction': 'Enter the Yash Complex building', 'direction': 'enter', 'indoor': False, 'is_critical': True, 'risk_level': 'high', 'fallback_text': 'Enter Yash Complex (2nd building)', 'heading': 90.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_town_hall, 'order': 6, 'name': '5th Floor - Destination', 'short_instruction': 'Take stairs or lift to 5th floor', 'direction': 'climb', 'indoor': True, 'floor_context': '5th Floor', 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Go to 5th floor', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
    ]
    
    # Building entrance route
    building_cps = [
        {'route_id': route_building, 'order': 1, 'name': 'Building Main Gate', 'short_instruction': 'Enter through the main gate of Yash Complex', 'direction': 'enter', 'indoor': False, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Enter Yash Complex main gate', 'heading': 90.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_building, 'order': 2, 'name': 'Building Lobby - Lift/Stairs', 'short_instruction': 'Find the lift or stairs in the lobby area', 'direction': 'straight', 'indoor': True, 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Look for lift or stairs in lobby', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
        {'route_id': route_building, 'order': 3, 'name': '5th Floor - Destination', 'short_instruction': 'Go to 5th floor, office is on the left', 'direction': 'destination', 'indoor': True, 'floor_context': '5th Floor', 'is_critical': True, 'risk_level': 'low', 'fallback_text': 'Go to 5th floor, left side', 'heading': 0.0, 'lat': 28.6546, 'lng': 77.2273},
    ]
    
    all_cps = []
    for cp_list in [metro_cps, red_fort_cps, omaxe_cps, town_hall_cps, building_cps]:
        for cp in cp_list:
            cp['id'] = gen_id()
            cp.setdefault('long_instruction', cp.get('short_instruction', ''))
            cp.setdefault('landmark_description', '')
            cp.setdefault('what_to_look_for', '')
            cp.setdefault('photo_url', '')
            cp.setdefault('video_url', '')
            cp.setdefault('arrow_map_url', '')
            cp.setdefault('floor_context', '')
            cp.setdefault('lat', 0.0)
            cp.setdefault('lng', 0.0)
            cp.setdefault('heading', 0.0)
            cp['created_at'] = now().isoformat()
            cp['updated_at'] = now().isoformat()
            all_cps.append(cp)
    
    await db.checkpoints.insert_many(all_cps)
    print(f'Seeded {len(all_cps)} checkpoints')
    
    # ---- Internal Users ----
    admin_id = gen_id()
    helpdesk_id = gen_id()
    trainer_id = gen_id()
    
    users = [
        {'id': admin_id, 'username': 'admin', 'display_name': 'System Admin', 'role': 'admin', 'active': True, 'created_at': now().isoformat()},
        {'id': helpdesk_id, 'username': 'helpdesk1', 'display_name': 'Helpdesk Agent 1', 'role': 'helpdesk', 'active': True, 'created_at': now().isoformat()},
        {'id': trainer_id, 'username': 'trainer1', 'display_name': 'Map Trainer 1', 'role': 'trainer', 'active': True, 'created_at': now().isoformat()},
    ]
    await db.users.insert_many(users)
    print(f'Seeded {len(users)} users')
    
    # ---- Gold Rates ----
    gold_rate = {
        'id': gen_id(),
        'rate_24k': 72500.0,
        'rate_22k': 66450.0,
        'rate_18k': 54375.0,
        'updated_by': admin_id,
        'updated_at': now().isoformat()
    }
    await db.gold_rates.insert_one(gold_rate)
    print('Seeded gold rates')
    
    # ---- Gallery Items ----
    gallery = [
        {'id': gen_id(), 'title': 'Traditional Gold Necklace', 'description': 'Handcrafted 22K gold necklace with kundan work', 'image_url': '', 'category': 'Necklaces', 'weight': '45g', 'active': True, 'created_at': now().isoformat()},
        {'id': gen_id(), 'title': 'Diamond Earrings', 'description': 'Elegant diamond studded earrings in 18K gold', 'image_url': '', 'category': 'Earrings', 'weight': '8g', 'active': True, 'created_at': now().isoformat()},
        {'id': gen_id(), 'title': 'Gold Bangles Set', 'description': 'Set of 4 bangles in 22K gold with intricate design', 'image_url': '', 'category': 'Bangles', 'weight': '60g', 'active': True, 'created_at': now().isoformat()},
        {'id': gen_id(), 'title': 'Bridal Collection Ring', 'description': 'Stunning bridal ring with ruby and diamond', 'image_url': '', 'category': 'Rings', 'weight': '12g', 'active': True, 'created_at': now().isoformat()},
    ]
    await db.gallery_items.insert_many(gallery)
    print(f'Seeded {len(gallery)} gallery items')
    
    # Create indexes
    await db.sessions.create_index('business_id')
    await db.sessions.create_index('status')
    await db.session_events.create_index('session_id')
    await db.session_events.create_index('business_id')
    await db.checkpoints.create_index([('route_id', 1), ('order', 1)])
    await db.qr_sources.create_index('code', unique=True)
    await db.users.create_index('username', unique=True)
    await db.helpdesk_cases.create_index('status')
    await db.callback_requests.create_index('status')
    
    print('\n=== Seed Complete ===')
    print(f'AJPL Business ID: {ajpl_id}')
    print(f'Yash Business ID: {yash_id}')
    print(f'QR Codes: AJPL-DEFAULT, AJPL-METRO, YASH-DEFAULT, YASH-WHOLESALE')
    print(f'Admin user: admin')
    print(f'Helpdesk user: helpdesk1')
    print(f'Trainer user: trainer1')
    
    client.close()

if __name__ == '__main__':
    asyncio.run(seed())
