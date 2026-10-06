import datetime
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.narrative.models import Project, Act, Sequence, Scene
from apps.breakdown.models import MasterLocation, Character, CostumeLook, Prop, SceneBreakdownItem
from apps.shots.models import CameraSetup, Shot, Take
from apps.logistics.models import ProductionUnit, ShootDay, StripboardItem
from apps.common.lexorank import midpoint
from apps.core.models import User, ProjectMembership

class Command(BaseCommand):
    help = "Seeds a realistic 3-Act film structure with sequences, scenes, script blocks, coverage, and breakdown"

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding for Movie Management Studio...")

        # 1. Project
        project_title = "CHRONOS INCIDENT"
        project, created = Project.objects.get_or_create(
            slug=slugify(project_title),
            defaults={
                'title': project_title,
                'aspect_ratio': '2.39:1 (Anamorphic)',
                'target_runtime_minutes': 118,
            }
        )
        
        dev_user, _ = User.objects.get_or_create(
            username="dev_admin",
            defaults={"email": "admin@cineflow.local"}
        )
        ProjectMembership.objects.get_or_create(
            user=dev_user,
            project=project,
            defaults={'role': 'OWNER'}
        )
        
        self.stdout.write(f"Project: {project.title} ({project.id})")

        # 2. Characters & Costume Looks
        c_karen, _ = Character.objects.get_or_create(
            project=project,
            cast_id_number=1,
            defaults={'name': 'Karen Ward', 'actor_name': 'Elena Rostova'}
        )
        look_karen_1, _ = CostumeLook.objects.get_or_create(
            character=c_karen,
            look_number='Look 1 - Tactical',
            defaults={
                'description': 'Matte black carbon weave vest, tactical harness, comms earpiece',
                'continuity_photo_url': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600'
            }
        )
        look_karen_2, _ = CostumeLook.objects.get_or_create(
            character=c_karen,
            look_number='Look 2 - Lab Infiltration',
            defaults={
                'description': 'Sterile white hazmat coat with magnetic security badge',
                'continuity_photo_url': 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600'
            }
        )

        c_vance, _ = Character.objects.get_or_create(
            project=project,
            cast_id_number=2,
            defaults={'name': 'Vance Sterling', 'actor_name': 'Marcus Cole'}
        )
        look_vance_1, _ = CostumeLook.objects.get_or_create(
            character=c_vance,
            look_number='Look 1 - Heavy Operative',
            defaults={
                'description': 'Reinforced Kevlar trench coat, silenced sidearm holster, fingerless gloves',
                'continuity_photo_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600'
            }
        )

        c_thorne, _ = Character.objects.get_or_create(
            project=project,
            cast_id_number=3,
            defaults={'name': 'Dr. Aris Thorne', 'actor_name': 'David Chen'}
        )
        look_thorne_1, _ = CostumeLook.objects.get_or_create(
            character=c_thorne,
            look_number='Look 1 - Chief Scientist',
            defaults={
                'description': 'Tailored charcoal suit, biometric scanner ring, silver spectacles',
                'continuity_photo_url': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600'
            }
        )

        # 3. Master Locations
        loc_vault, _ = MasterLocation.objects.get_or_create(
            project=project,
            name='OmniCorp Deep Storage Vault 9',
            defaults={
                'address': '450 Neo Financial Plaza, Sub-level 4',
                'gps_coordinates': '37.7749 N, 122.4194 W',
                'sun_path_notes': 'Subterranean interior. No natural sun. High contrast sodium vapor & fluorescent emergency fixtures.'
            }
        )
        loc_rooftop, _ = MasterLocation.objects.get_or_create(
            project=project,
            name='Sector 7 Industrial Rooftop',
            defaults={
                'address': 'Pier 44 Warehouse District',
                'gps_coordinates': '37.7812 N, 122.3887 W',
                'sun_path_notes': 'Full 360 horizon. Blue hour sunset window at 19:42 to 20:15. Rain towers required.'
            }
        )
        loc_observatory, _ = MasterLocation.objects.get_or_create(
            project=project,
            name='Mount Apex Astronomical Array',
            defaults={
                'address': 'Ridge Crest Road Summit',
                'gps_coordinates': '34.1184 N, 118.3004 W',
                'sun_path_notes': 'High altitude clear night skies. Starlight and moonlit silhouettes.'
            }
        )

        # 4. Props
        prop_keycard, _ = Prop.objects.get_or_create(
            project=project,
            name='Quantum Encryption Drive',
            defaults={'is_hero_prop': True, 'quantity': 2}
        )
        prop_emp, _ = Prop.objects.get_or_create(
            project=project,
            name='Handheld EMP Pulse Emitter',
            defaults={'is_hero_prop': True, 'quantity': 1}
        )
        prop_firearm, _ = Prop.objects.get_or_create(
            project=project,
            name='Silenced 9mm Tactical Pistol',
            defaults={'is_hero_prop': False, 'quantity': 3}
        )
        prop_briefcase, _ = Prop.objects.get_or_create(
            project=project,
            name='Carbon Fiber Cryo-Briefcase',
            defaults={'is_hero_prop': True, 'quantity': 1}
        )

        # 5. Production Unit & Logistics
        unit, _ = ProductionUnit.objects.get_or_create(
            project=project,
            defaults={'name': 'First Unit (Alpha)'}
        )

        shoot_day_1, _ = ShootDay.objects.get_or_create(
            unit=unit,
            day_number=1,
            defaults={
                'calendar_date': datetime.date(2026, 11, 2),
                'general_crew_call': datetime.time(6, 0),
                'shooting_call': datetime.time(7, 30),
                'hospital_address': 'Mercy General Hospital, 1200 St. Jude Ave (5 mins away)'
            }
        )
        shoot_day_2, _ = ShootDay.objects.get_or_create(
            unit=unit,
            day_number=2,
            defaults={
                'calendar_date': datetime.date(2026, 11, 3),
                'general_crew_call': datetime.time(16, 0),
                'shooting_call': datetime.time(17, 30),
                'hospital_address': 'Mercy General Hospital, 1200 St. Jude Ave (5 mins away)'
            }
        )

        # 6. Acts, Sequences, Scenes Data
        acts_data = [
            {
                'title': 'ACT I: THE ANOMALY',
                'order_index': '10',
                'target_page_length': 30.0,
                'dramatic_milestone': 'Inciting Incident: The Vault is breached and the timeline starts to unravel.',
                'sequences': [
                    {
                        'title': 'Sequence 1: The Breach at Vault 9',
                        'order_index': '10.1',
                        'color_tag': '#3B82F6',
                        'dramatic_question': 'Can Karen and Vance extract the Quantum Key before the lockdown executes?',
                        'temp_score_reference': 'Hans Zimmer - Time (Aggressive Percussion Remix)',
                        'scenes': [
                            {
                                'scene_number': '1',
                                'order_index': '10.1.1',
                                'int_ext': 'INT',
                                'set_name': 'CRYPTO VAULT 9 - SUB-LEVEL 4',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 12, # 1 4/8 pages
                                'estimated_shoot_minutes': 240,
                                'synopsis': 'Karen hacks the neural security terminal while Vance holds the perimeter as security sirens start howling.',
                                'script_data': {
                                    'blocks': [
                                        {'id': 'b-101', 'type': 'slugline', 'content': 'INT. CRYPTO VAULT 9 - SUB-LEVEL 4 - NIGHT'},
                                        {'id': 'b-102', 'type': 'action', 'content': 'Cold, sterile neon light flickers across titanium reinforced security doors. A lone red LED blinks in rhythmic pulses.'},
                                        {'id': 'b-103', 'type': 'character', 'content': 'KAREN'},
                                        {'id': 'b-104', 'type': 'dialogue', 'content': 'The biometric bypass is taking longer than expected. We have three minutes.'},
                                        {'id': 'b-105', 'type': 'character', 'content': 'VANCE'},
                                        {'id': 'b-106', 'type': 'parenthetical', 'content': '(checking thermal scanner)'},
                                        {'id': 'b-107', 'type': 'dialogue', 'content': "You've got ninety seconds. Heavy security just breached elevator bank bravo."},
                                        {'id': 'b-108', 'type': 'action', 'content': 'Spark erupts from the digital bypass console. The hydraulic locking pins disengage with a bone-jarring CLANG.'},
                                        {'id': 'b-109', 'type': 'character', 'content': 'KAREN'},
                                        {'id': 'b-110', 'type': 'dialogue', 'content': "We're in. Grab the cryo-case and don't look back."}
                                    ]
                                },
                                'setups': [
                                    {
                                        'code': 'A',
                                        'notes': 'Wide Master 24mm anamorphic on Ronin 2 crane. Key: Cool cyan top-light, rim: Warm sodium tungsten from hallway.',
                                        'floorplan': 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=600',
                                        'shots': [
                                            {
                                                'code': '1',
                                                'order': '10',
                                                'size': 'Wide',
                                                'lens': '24mm Anamorphic',
                                                'movement': 'Crane Down',
                                                'framing': 'High angle moving down to eye level revealing vault depth',
                                                'storyboard': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
                                                'covered': ['b-101', 'b-102', 'b-103', 'b-104', 'b-105', 'b-106', 'b-107', 'b-108', 'b-109', 'b-110'],
                                                'takes': [
                                                    {'num': 1, 'circle': False, 'card': 'A01', 'roll': 'S01', 'tin': '01:00:10:00', 'tout': '01:01:25:00', 'notes': 'Camera bump at crane descent finish.'},
                                                    {'num': 2, 'circle': True, 'card': 'A01', 'roll': 'S01', 'tin': '01:03:00:00', 'tout': '01:04:15:10', 'notes': 'Flawless move, spark timing dialed in perfectly.'},
                                                    {'num': 3, 'circle': False, 'card': 'A01', 'roll': 'S01', 'tin': '01:05:40:00', 'tout': '01:06:55:00', 'notes': 'Safety take.'}
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        'code': 'B',
                                        'notes': 'Medium Close Up on Karen at console. Eye-line screen right. Practical console glow bouncing on face.',
                                        'floorplan': '',
                                        'shots': [
                                            {
                                                'code': '1',
                                                'order': '20',
                                                'size': 'MCU',
                                                'lens': '50mm Prime',
                                                'movement': 'Handheld (subtle)',
                                                'framing': 'Tight over-the-shoulder onto Karen typing furiously',
                                                'storyboard': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
                                                'covered': ['b-103', 'b-104', 'b-108', 'b-109', 'b-110'],
                                                'takes': [
                                                    {'num': 1, 'circle': True, 'card': 'A02', 'roll': 'S01', 'tin': '01:10:00:00', 'tout': '01:10:55:00', 'notes': 'Great intensity from Elena.'}
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        'code': 'C',
                                        'notes': 'Medium Low Angle on Vance aiming down the dark access corridor.',
                                        'floorplan': '',
                                        'shots': [
                                            {
                                                'code': '1',
                                                'order': '30',
                                                'size': 'CU',
                                                'lens': '85mm Anamorphic',
                                                'movement': 'Static',
                                                'framing': 'Silhouetted rim light highlighting firearm and eye reflection',
                                                'storyboard': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
                                                'covered': ['b-105', 'b-106', 'b-107'],
                                                'takes': [
                                                    {'num': 1, 'circle': True, 'card': 'A02', 'roll': 'S01', 'tin': '01:14:10:00', 'tout': '01:15:00:00', 'notes': 'Solid delivery and clean audio.'}
                                                ]
                                            }
                                        ]
                                    }
                                ],
                                'breakdown': [
                                    {'type': 'PROP', 'prop': prop_keycard, 'notes': 'Glows ultraviolet when connected', 'crit': True},
                                    {'type': 'PROP', 'prop': prop_briefcase, 'notes': 'Contains pressurized quantum core', 'crit': True},
                                    {'type': 'WARDROBE', 'costume': look_karen_1, 'notes': 'Vest wired with comms transmitter', 'crit': False},
                                    {'type': 'SFX', 'notes': 'Hydraulic release CO2 blast and electrical spark burst on bypass', 'crit': True},
                                    {'type': 'SOUND', 'notes': 'Distant pulsing alarm horn (110 BPM)', 'crit': False}
                                ]
                            },
                            {
                                'scene_number': '2',
                                'order_index': '10.1.2',
                                'int_ext': 'EXT',
                                'set_name': 'INDUSTRIAL ROOFTOP ESCAPE ROUTE',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 8, # 1 page
                                'estimated_shoot_minutes': 180,
                                'synopsis': 'Pursued by drones, Karen and Vance cross a suspended sky-bridge in torrential downpour.',
                                'script_data': {
                                    'blocks': [
                                        {'id': 'b-201', 'type': 'slugline', 'content': 'EXT. INDUSTRIAL ROOFTOP - NIGHT (RAIN)'},
                                        {'id': 'b-202', 'type': 'action', 'content': 'Rain sheets across gravel tar. Searchlights from airborne patrol drones sweep the catwalks.'},
                                        {'id': 'b-203', 'type': 'character', 'content': 'VANCE'},
                                        {'id': 'b-204', 'type': 'dialogue', 'content': 'Down! Drones on high approach!'},
                                        {'id': 'b-205', 'type': 'action', 'content': 'A twin-rotor hunter-killer drone dives through the rain, spotlight blinding them.'}
                                    ]
                                },
                                'setups': [],
                                'breakdown': [
                                    {'type': 'SFX', 'notes': 'Wet-down and overhead torrential rain rig', 'crit': True},
                                    {'type': 'VFX', 'notes': 'CGI drone searchlights and rotor blades', 'crit': True}
                                ]
                            },
                            {
                                'scene_number': '3',
                                'order_index': '10.1.3',
                                'int_ext': 'INT',
                                'set_name': 'GETAWAY VEHICLE - ALLEYWAY',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 6,
                                'estimated_shoot_minutes': 120,
                                'synopsis': 'Inside the armored surveillance van, the quantum drive begins self-generating an anomalous temporal signature.',
                                'script_data': {
                                    'blocks': [
                                        {'id': 'b-301', 'type': 'slugline', 'content': 'INT. GETAWAY VEHICLE - NIGHT'},
                                        {'id': 'b-302', 'type': 'action', 'content': 'The van swerves around a concrete pillar. Inside, Karen inspects the humming quantum drive.'},
                                        {'id': 'b-303', 'type': 'character', 'content': 'KAREN'},
                                        {'id': 'b-304', 'type': 'dialogue', 'content': "This isn't encrypted financial data. It's a localized tachyon sequencer."}
                                    ]
                                },
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    },
                    {
                        'title': 'Sequence 2: The Cleaners Arrive',
                        'order_index': '10.2',
                        'color_tag': '#8B5CF6',
                        'dramatic_question': 'Can they decode the anomaly before OmniCorp assassins track their signal?',
                        'temp_score_reference': 'Johann Johannsson - Sicario (The Beast)',
                        'scenes': [
                            {
                                'scene_number': '4',
                                'order_index': '10.2.1',
                                'int_ext': 'INT',
                                'set_name': 'SAFEHOUSE APARTMENT',
                                'time_of_day': 'DAY',
                                'pages_eighths': 10,
                                'estimated_shoot_minutes': 160,
                                'synopsis': 'The morning light reveals strange fractal burns on Karen’s forearm as the drive activates unprompted.',
                                'script_data': {'blocks': [{'id': 'b-401', 'type': 'slugline', 'content': 'INT. SAFEHOUSE APARTMENT - DAY'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '5',
                                'order_index': '10.2.2',
                                'int_ext': 'EXT',
                                'set_name': 'CHINATOWN MARKET',
                                'time_of_day': 'RAIN',
                                'pages_eighths': 8,
                                'estimated_shoot_minutes': 200,
                                'synopsis': 'A covert rendezvous with an underground temporal physicist under neon-soaked market umbrellas.',
                                'script_data': {'blocks': [{'id': 'b-501', 'type': 'slugline', 'content': 'EXT. CHINATOWN MARKET - RAIN'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '6',
                                'order_index': '10.2.3',
                                'int_ext': 'INT',
                                'set_name': 'BLACK SITE BRIEFING ROOM',
                                'time_of_day': 'DAY',
                                'pages_eighths': 14,
                                'estimated_shoot_minutes': 220,
                                'synopsis': 'Dr. Thorne addresses OmniCorp board members, confirming the stolen artifact has initiated a 48-hour loop.',
                                'script_data': {'blocks': [{'id': 'b-601', 'type': 'slugline', 'content': 'INT. BLACK SITE BRIEFING ROOM - DAY'}]},
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    }
                ]
            },
            {
                'title': 'ACT II: THE CONVERGENCE',
                'order_index': '20',
                'target_page_length': 55.0,
                'dramatic_milestone': 'Midpoint: Karen discovers the mission was designed by her future self.',
                'sequences': [
                    {
                        'title': 'Sequence 3: Infiltrating the Nexus',
                        'order_index': '20.1',
                        'color_tag': '#EC4899',
                        'dramatic_question': 'How will they bypass the quantum barrier without collapsing reality?',
                        'temp_score_reference': 'Ludwig Goransson - Tenet (Freeport)',
                        'scenes': [
                            {
                                'scene_number': '7',
                                'order_index': '20.1.1',
                                'int_ext': 'EXT',
                                'set_name': 'NEO-METRO SUBWAY TRANSIT',
                                'time_of_day': 'DUSK',
                                'pages_eighths': 9,
                                'estimated_shoot_minutes': 180,
                                'synopsis': 'High-speed chase along the magnetic levitation subway lines.',
                                'script_data': {'blocks': [{'id': 'b-701', 'type': 'slugline', 'content': 'EXT. NEO-METRO SUBWAY TRANSIT - DUSK'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '8',
                                'order_index': '20.1.2',
                                'int_ext': 'INT',
                                'set_name': 'SERVER CORE LABORATORY',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 16,
                                'estimated_shoot_minutes': 300,
                                'synopsis': 'Karen confronts the digital ghost of herself inside the supercooled liquid nitrogen server core.',
                                'script_data': {'blocks': [{'id': 'b-801', 'type': 'slugline', 'content': 'INT. SERVER CORE LABORATORY - NIGHT'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '9',
                                'order_index': '20.1.3',
                                'int_ext': 'INT',
                                'set_name': 'HYPERBARIC CHAMBER',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 7,
                                'estimated_shoot_minutes': 140,
                                'synopsis': 'Vance sustains temporal compression sickness and must be stabilized under immense atmospheric pressure.',
                                'script_data': {'blocks': [{'id': 'b-901', 'type': 'slugline', 'content': 'INT. HYPERBARIC CHAMBER - NIGHT'}]},
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    },
                    {
                        'title': 'Sequence 4: Betrayal in the Shadows',
                        'order_index': '20.2',
                        'color_tag': '#F59E0B',
                        'dramatic_question': 'Is Vance loyal to the rebellion or a double-agent for OmniCorp security?',
                        'temp_score_reference': 'Cliff Martinez - Drive (He Had a Good Time)',
                        'scenes': [
                            {
                                'scene_number': '10',
                                'order_index': '20.2.1',
                                'int_ext': 'EXT',
                                'set_name': 'DESERT JUNKYARD OUTPOST',
                                'time_of_day': 'SUNSET',
                                'pages_eighths': 11,
                                'estimated_shoot_minutes': 210,
                                'synopsis': 'A tense weapon trade in a graveyard of decommissioned fighter jets.',
                                'script_data': {'blocks': [{'id': 'b-1001', 'type': 'slugline', 'content': 'EXT. DESERT JUNKYARD OUTPOST - SUNSET'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '11',
                                'order_index': '20.2.2',
                                'int_ext': 'INT',
                                'set_name': 'ABANDONED OBSERVATORY TOWER',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 13,
                                'estimated_shoot_minutes': 250,
                                'synopsis': 'Vance makes an encrypted transmission to Thorne while Karen watches from the shadows.',
                                'script_data': {'blocks': [{'id': 'b-1101', 'type': 'slugline', 'content': 'INT. ABANDONED OBSERVATORY TOWER - NIGHT'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '12',
                                'order_index': '20.2.3',
                                'int_ext': 'INT',
                                'set_name': 'OBSERVATORY DOME CLIMAX',
                                'time_of_day': 'NIGHT',
                                'pages_eighths': 15,
                                'estimated_shoot_minutes': 280,
                                'synopsis': 'An ideological showdown beneath the revolving telescope dome under sweeping starlight.',
                                'script_data': {'blocks': [{'id': 'b-1201', 'type': 'slugline', 'content': 'INT. OBSERVATORY DOME CLIMAX - NIGHT'}]},
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    }
                ]
            },
            {
                'title': 'ACT III: THE PARADOX',
                'order_index': '30',
                'target_page_length': 33.0,
                'dramatic_milestone': 'Climax: Detonating the Chrono-Disruptor at the top of the Citadel.',
                'sequences': [
                    {
                        'title': 'Sequence 5: Breaching the Citadel',
                        'order_index': '30.1',
                        'color_tag': '#EF4444',
                        'dramatic_question': 'Can Karen reach the apex reactor before the paradox consumes the city?',
                        'temp_score_reference': 'Junkie XL - Mad Max Fury Road (Brothers in Arms)',
                        'scenes': [
                            {
                                'scene_number': '13',
                                'order_index': '30.1.1',
                                'int_ext': 'EXT',
                                'set_name': 'CITADEL OUTER PERIMETER',
                                'time_of_day': 'DAWN',
                                'pages_eighths': 8,
                                'estimated_shoot_minutes': 180,
                                'synopsis': 'The final assault begins as electromagnetic storms tear through the financial district sky.',
                                'script_data': {'blocks': [{'id': 'b-1301', 'type': 'slugline', 'content': 'EXT. CITADEL OUTER PERIMETER - DAWN'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '14',
                                'order_index': '30.1.2',
                                'int_ext': 'INT',
                                'set_name': 'QUANTUM CORE REACTOR',
                                'time_of_day': 'DAWN',
                                'pages_eighths': 18,
                                'estimated_shoot_minutes': 360,
                                'synopsis': 'Zero gravity combat inside the rotating magnetic containment field.',
                                'script_data': {'blocks': [{'id': 'b-1401', 'type': 'slugline', 'content': 'INT. QUANTUM CORE REACTOR - DAWN'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '15',
                                'order_index': '30.1.3',
                                'int_ext': 'INT',
                                'set_name': 'EXECUTIVE PENTHOUSE SUITE',
                                'time_of_day': 'DAY',
                                'pages_eighths': 12,
                                'estimated_shoot_minutes': 240,
                                'synopsis': 'Karen corners Dr. Thorne at gunpoint as the countdown ticks down to zero.',
                                'script_data': {'blocks': [{'id': 'b-1501', 'type': 'slugline', 'content': 'INT. EXECUTIVE PENTHOUSE SUITE - DAY'}]},
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    },
                    {
                        'title': 'Sequence 6: Echoes of Tomorrow',
                        'order_index': '30.2',
                        'color_tag': '#10B981',
                        'dramatic_question': 'Did the loop truly break, or did it merely restart?',
                        'temp_score_reference': 'Max Richter - On the Nature of Daylight',
                        'scenes': [
                            {
                                'scene_number': '16',
                                'order_index': '30.2.1',
                                'int_ext': 'EXT',
                                'set_name': 'PENTHOUSE HELIPAD OVERLOOK',
                                'time_of_day': 'DAY',
                                'pages_eighths': 6,
                                'estimated_shoot_minutes': 140,
                                'synopsis': 'The shockwave ripples outward, shattering the glass facade in slow motion reverse.',
                                'script_data': {'blocks': [{'id': 'b-1601', 'type': 'slugline', 'content': 'EXT. PENTHOUSE HELIPAD OVERLOOK - DAY'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '17',
                                'order_index': '30.2.2',
                                'int_ext': 'INT',
                                'set_name': 'SUBWAY STATION PLATFORM',
                                'time_of_day': 'DAY',
                                'pages_eighths': 8,
                                'estimated_shoot_minutes': 160,
                                'synopsis': 'Crowds move normally. A newspaper on a bench shows today’s date—or is it yesterday?',
                                'script_data': {'blocks': [{'id': 'b-1701', 'type': 'slugline', 'content': 'INT. SUBWAY STATION PLATFORM - DAY'}]},
                                'setups': [],
                                'breakdown': []
                            },
                            {
                                'scene_number': '18',
                                'order_index': '30.2.3',
                                'int_ext': 'EXT',
                                'set_name': 'SUNSET SKYLINE OVERLOOK',
                                'time_of_day': 'SUNSET',
                                'pages_eighths': 5,
                                'estimated_shoot_minutes': 120,
                                'synopsis': 'Karen drops the inactive quantum core into the river. A single drop of rain falls upward. FADE OUT.',
                                'script_data': {'blocks': [{'id': 'b-1801', 'type': 'slugline', 'content': 'EXT. SUNSET SKYLINE OVERLOOK - SUNSET'}]},
                                'setups': [],
                                'breakdown': []
                            }
                        ]
                    }
                ]
            }
        ]

        all_scenes = []

        for act_info in acts_data:
            act, _ = Act.objects.get_or_create(
                project=project,
                title=act_info['title'],
                defaults={
                    'order_index': act_info['order_index'],
                    'target_page_length': act_info['target_page_length'],
                    'dramatic_milestone': act_info['dramatic_milestone']
                }
            )
            for seq_info in act_info['sequences']:
                seq, _ = Sequence.objects.get_or_create(
                    act=act,
                    title=seq_info['title'],
                    defaults={
                        'order_index': seq_info['order_index'],
                        'color_tag': seq_info['color_tag'],
                        'dramatic_question': seq_info['dramatic_question'],
                        'temp_score_reference': seq_info['temp_score_reference']
                    }
                )
                for sc_info in seq_info['scenes']:
                    sc, sc_created = Scene.objects.get_or_create(
                        sequence=seq,
                        scene_number=sc_info['scene_number'],
                        defaults={
                            'order_index': sc_info['order_index'],
                            'int_ext': sc_info['int_ext'],
                            'set_name': sc_info['set_name'],
                            'time_of_day': sc_info['time_of_day'],
                            'pages_eighths': sc_info['pages_eighths'],
                            'estimated_shoot_minutes': sc_info['estimated_shoot_minutes'],
                            'synopsis': sc_info['synopsis'],
                            'script_data': sc_info['script_data']
                        }
                    )
                    all_scenes.append(sc)

                    # Create setups and shots if specified
                    for s_setup in sc_info.get('setups', []):
                        cam_setup, _ = CameraSetup.objects.get_or_create(
                            scene=sc,
                            setup_code=s_setup['code'],
                            defaults={
                                'lighting_package_notes': s_setup['notes'],
                                'overhead_floorplan_url': s_setup.get('floorplan', '')
                            }
                        )
                        for s_shot in s_setup.get('shots', []):
                            shot_obj, _ = Shot.objects.get_or_create(
                                setup=cam_setup,
                                shot_code=s_shot['code'],
                                defaults={
                                    'order_index': s_shot['order'],
                                    'shot_size': s_shot['size'],
                                    'focal_length': s_shot['lens'],
                                    'camera_movement': s_shot['movement'],
                                    'framing_description': s_shot['framing'],
                                    'storyboard_frame_url': s_shot.get('storyboard', ''),
                                    'covered_script_blocks': s_shot.get('covered', [])
                                }
                            )
                            for s_take in s_shot.get('takes', []):
                                Take.objects.get_or_create(
                                    shot=shot_obj,
                                    take_number=s_take['num'],
                                    defaults={
                                        'is_circle_take': s_take['circle'],
                                        'camera_card': s_take['card'],
                                        'sound_roll': s_take['roll'],
                                        'timecode_in': s_take['tin'],
                                        'timecode_out': s_take['tout'],
                                        'script_supervisor_notes': s_take['notes']
                                    }
                                )

                    # Breakdown items
                    for b_item in sc_info.get('breakdown', []):
                        SceneBreakdownItem.objects.get_or_create(
                            scene=sc,
                            element_type=b_item['type'],
                            prop=b_item.get('prop'),
                            costume=b_item.get('costume'),
                            defaults={
                                'custom_notes': b_item.get('notes', ''),
                                'is_continuity_critical': b_item.get('crit', False)
                            }
                        )

        # 7. Stripboard schedule setup
        if all_scenes:
            # Day 1: Scene 1, 2, Lunch, Scene 3
            StripboardItem.objects.get_or_create(
                shoot_day=shoot_day_1,
                order_index='10',
                item_type='SCENE',
                scene=all_scenes[0]
            )
            StripboardItem.objects.get_or_create(
                shoot_day=shoot_day_1,
                order_index='20',
                item_type='SCENE',
                scene=all_scenes[1]
            )
            StripboardItem.objects.get_or_create(
                shoot_day=shoot_day_1,
                order_index='30',
                item_type='BANNER',
                banner_label='--- 13:00 LUNCH BREAK (1 HOUR) ---'
            )
            if len(all_scenes) > 2:
                StripboardItem.objects.get_or_create(
                    shoot_day=shoot_day_1,
                    order_index='40',
                    item_type='SCENE',
                    scene=all_scenes[2]
                )

            # Day 2: Company move, Scene 4, Scene 5
            StripboardItem.objects.get_or_create(
                shoot_day=shoot_day_2,
                order_index='10',
                item_type='BANNER',
                banner_label='=== COMPANY MOVE TO CHINATOWN LOCATION ==='
            )
            if len(all_scenes) > 3:
                StripboardItem.objects.get_or_create(
                    shoot_day=shoot_day_2,
                    order_index='20',
                    item_type='SCENE',
                    scene=all_scenes[3]
                )
            if len(all_scenes) > 4:
                StripboardItem.objects.get_or_create(
                    shoot_day=shoot_day_2,
                    order_index='30',
                    item_type='SCENE',
                    scene=all_scenes[4]
                )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded project '{project.title}' with 3 Acts, 6 Sequences, 18 Scenes, Coverage, Breakdown & Stripboard!"
        ))
