-- ==============================================================================
-- CIVICFIX — OPTIONAL DEVELOPMENT & DEMO SEED SCRIPT
-- ==============================================================================
-- NOTICE: This script is intended strictly for development and testing environments.
-- It inserts realistic sample civic complaints (potholes, streetlights, drainage, garbage)
-- to allow verification of the Map, My Complaints, and Admin Dashboard views.
-- 
-- IMPORTANT:
-- 1. Ensure you have run schema.sql first.
-- 2. Make sure you have at least one test user signed up via the app, OR this script
--    will attach demo complaints to the first available user in public.profiles.
-- ==============================================================================

DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Select the first registered user profile as the author for demonstration purposes
    SELECT id INTO sample_user_id FROM public.profiles LIMIT 1;

    -- If no user profile exists yet, notify the developer
    IF sample_user_id IS NULL THEN
        RAISE NOTICE 'No profile found in public.profiles. Please register at least one citizen account through the CivicFix signup page before running this seed script.';
        RETURN;
    END IF;

    -- 1. Sample Pothole Complaint (Status: reported)
    INSERT INTO public.complaints (
        user_id,
        category,
        title,
        description,
        latitude,
        longitude,
        address,
        landmark,
        photo_url,
        status,
        upvote_count,
        created_at,
        updated_at
    ) VALUES (
        sample_user_id,
        'pothole',
        'Deep pothole on Main Street near intersection',
        'A large, hazardous pothole approximately 2 feet wide has formed near the pedestrian crossing. Causing severe traffic slowdowns and hazard for two-wheelers.',
        12.9716,
        77.5946,
        'Main Street Crossing, Central District, Bengaluru',
        'Opposite City Library gate',
        NULL,
        'reported',
        3,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    );

    -- 2. Sample Broken Streetlight Complaint (Status: in_progress)
    INSERT INTO public.complaints (
        id,
        user_id,
        category,
        title,
        description,
        latitude,
        longitude,
        address,
        landmark,
        photo_url,
        status,
        upvote_count,
        created_at,
        updated_at
    ) VALUES (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::UUID,
        sample_user_id,
        'streetlight',
        'Non-functioning streetlights along Park Avenue',
        'Three consecutive pole lights are dark every night between 7 PM and 6 AM, creating safety concerns for pedestrians walking home.',
        12.9750,
        77.5980,
        'Park Avenue, East Sector, Bengaluru',
        'Near Community Park Entrance 2',
        NULL,
        'in_progress',
        7,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;

    -- Add update audit entry for streetlight
    INSERT INTO public.complaint_updates (
        complaint_id,
        user_id,
        previous_status,
        new_status,
        note,
        photo_url,
        created_at
    ) VALUES (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::UUID,
        sample_user_id,
        'reported',
        'in_progress',
        'Electrical maintenance crew has been dispatched with replacement LED fixtures. Expected work completion in 48 hours.',
        NULL,
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT DO NOTHING;

    -- 3. Sample Drainage Blockage (Status: resolved)
    INSERT INTO public.complaints (
        id,
        user_id,
        category,
        title,
        description,
        latitude,
        longitude,
        address,
        landmark,
        photo_url,
        status,
        upvote_count,
        created_at,
        updated_at
    ) VALUES (
        'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e'::UUID,
        sample_user_id,
        'drainage',
        'Stormwater drain blocked by debris',
        'Drain overflow during rains causing waterlogging on the roadway and footpath.',
        12.9680,
        77.5900,
        'Market Road, West Zone, Bengaluru',
        'Near Metro Pillar 142',
        NULL,
        'resolved',
        12,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Add update audit entry for drainage
    INSERT INTO public.complaint_updates (
        complaint_id,
        user_id,
        previous_status,
        new_status,
        note,
        photo_url,
        created_at
    ) VALUES (
        'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e'::UUID,
        sample_user_id,
        'in_progress',
        'resolved',
        'Drain desilting team cleared the blockage using high-pressure jetting. Water flow has been restored to normal capacity.',
        NULL,
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT DO NOTHING;

    -- 4. Sample Garbage Accumulation (Status: reported)
    INSERT INTO public.complaints (
        user_id,
        category,
        title,
        description,
        latitude,
        longitude,
        address,
        landmark,
        photo_url,
        status,
        upvote_count,
        created_at,
        updated_at
    ) VALUES (
        sample_user_id,
        'garbage',
        'Uncollected municipal waste near residential corner',
        'Garbage has accumulated over the weekend and bins are overflowing onto the pavement.',
        12.9730,
        77.5920,
        '4th Cross, Greenview Layout, Bengaluru',
        'Behind Bus Shelter No. 8',
        NULL,
        'reported',
        5,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    );

    RAISE NOTICE 'Demo seed complaints inserted successfully for testing purposes.';
END $$;
