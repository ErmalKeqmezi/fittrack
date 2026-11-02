-- FitTrack reference data: muscle groups and the built-in exercise library.
-- This is catalogue data (no workouts or statistics), shipped as a migration so
-- every environment has the same library.

insert into public.muscle_groups (slug, name, body_region, sort_order) values
  ('chest',        'Chest',        'chest',     10),
  ('lats',         'Lats',         'back',      20),
  ('upper_back',   'Upper Back',   'back',      21),
  ('lower_back',   'Lower Back',   'back',      22),
  ('traps',        'Traps',        'back',      23),
  ('front_delts',  'Front Delts',  'shoulders', 30),
  ('side_delts',   'Side Delts',   'shoulders', 31),
  ('rear_delts',   'Rear Delts',   'shoulders', 32),
  ('biceps',       'Biceps',       'biceps',    40),
  ('triceps',      'Triceps',      'triceps',   50),
  ('forearms',     'Forearms',     'forearms',  55),
  ('quadriceps',   'Quadriceps',   'legs',      60),
  ('hamstrings',   'Hamstrings',   'legs',      61),
  ('glutes',       'Glutes',       'legs',      62),
  ('adductors',    'Adductors',    'legs',      63),
  ('calves',       'Calves',       'legs',      64),
  ('abs',          'Abs',          'core',      70),
  ('obliques',     'Obliques',     'core',      71);

-- name | description | primary | secondary (comma separated slugs) | equipment | category
with seed (name, description, primary_slug, secondary_slugs, equipment, category) as (
  values
  -- Chest
  ('Barbell Bench Press', 'Lie on a flat bench and press the bar from mid-chest to lockout.', 'chest', 'triceps,front_delts', 'barbell', 'compound'),
  ('Incline Barbell Bench Press', 'Bench press on a 30–45° incline to bias the upper chest.', 'chest', 'front_delts,triceps', 'barbell', 'compound'),
  ('Dumbbell Bench Press', 'Flat bench press with dumbbells for a longer range of motion.', 'chest', 'triceps,front_delts', 'dumbbell', 'compound'),
  ('Incline Dumbbell Press', 'Dumbbell press on an incline bench targeting the upper chest.', 'chest', 'front_delts,triceps', 'dumbbell', 'compound'),
  ('Decline Bench Press', 'Barbell press on a decline bench to bias the lower chest.', 'chest', 'triceps', 'barbell', 'compound'),
  ('Machine Chest Press', 'Seated plate- or stack-loaded horizontal press.', 'chest', 'triceps,front_delts', 'machine', 'compound'),
  ('Dumbbell Fly', 'Lower dumbbells in a wide arc with soft elbows, then squeeze together.', 'chest', 'front_delts', 'dumbbell', 'isolation'),
  ('Cable Crossover', 'Bring cable handles together in front of the chest from high pulleys.', 'chest', 'front_delts', 'cable', 'isolation'),
  ('Pec Deck', 'Machine fly with fixed arm path.', 'chest', 'front_delts', 'machine', 'isolation'),
  ('Push-Up', 'Bodyweight press from the floor with a rigid plank position.', 'chest', 'triceps,front_delts,abs', 'bodyweight', 'compound'),
  ('Chest Dip', 'Dip with a forward lean to emphasise the chest.', 'chest', 'triceps,front_delts', 'bodyweight', 'compound'),

  -- Back
  ('Conventional Deadlift', 'Lift the bar from the floor to hip lockout with a neutral spine.', 'lower_back', 'hamstrings,glutes,traps,forearms', 'barbell', 'compound'),
  ('Pull-Up', 'Hang with a pronated grip and pull the chest towards the bar.', 'lats', 'biceps,upper_back', 'bodyweight', 'compound'),
  ('Chin-Up', 'Pull-up with a supinated grip, increasing biceps involvement.', 'lats', 'biceps,upper_back', 'bodyweight', 'compound'),
  ('Lat Pulldown', 'Pull the bar to the upper chest from an overhead cable.', 'lats', 'biceps,upper_back', 'cable', 'compound'),
  ('Close-Grip Lat Pulldown', 'Pulldown with a neutral close-grip handle.', 'lats', 'biceps', 'cable', 'compound'),
  ('Barbell Row', 'Hinge forward and row the bar to the lower ribs.', 'upper_back', 'lats,biceps,rear_delts,lower_back', 'barbell', 'compound'),
  ('Pendlay Row', 'Strict barbell row from a dead stop on the floor each rep.', 'upper_back', 'lats,biceps,lower_back', 'barbell', 'compound'),
  ('One-Arm Dumbbell Row', 'Supported single-arm row to the hip.', 'lats', 'upper_back,biceps', 'dumbbell', 'compound'),
  ('Seated Cable Row', 'Row a cable handle to the torso while seated upright.', 'upper_back', 'lats,biceps,rear_delts', 'cable', 'compound'),
  ('Chest-Supported T-Bar Row', 'Prone-supported row on a T-bar or machine.', 'upper_back', 'lats,biceps,rear_delts', 'machine', 'compound'),
  ('Straight-Arm Pulldown', 'Pull a bar or rope down in an arc with straight arms.', 'lats', null, 'cable', 'isolation'),
  ('Barbell Shrug', 'Elevate the shoulders straight up while holding a barbell.', 'traps', 'forearms', 'barbell', 'isolation'),
  ('Back Extension', 'Hip extension on a 45° or 90° bench.', 'lower_back', 'glutes,hamstrings', 'bodyweight', 'isolation'),

  -- Shoulders
  ('Overhead Press', 'Standing barbell press from the front rack to overhead lockout.', 'front_delts', 'triceps,side_delts,upper_back', 'barbell', 'compound'),
  ('Seated Dumbbell Shoulder Press', 'Press dumbbells overhead from a seated, back-supported position.', 'front_delts', 'triceps,side_delts', 'dumbbell', 'compound'),
  ('Arnold Press', 'Dumbbell press that rotates from palms-in to palms-forward.', 'front_delts', 'side_delts,triceps', 'dumbbell', 'compound'),
  ('Machine Shoulder Press', 'Seated overhead press on a machine.', 'front_delts', 'triceps,side_delts', 'machine', 'compound'),
  ('Dumbbell Lateral Raise', 'Raise dumbbells out to the sides to shoulder height.', 'side_delts', 'traps', 'dumbbell', 'isolation'),
  ('Cable Lateral Raise', 'Single-arm lateral raise from a low pulley.', 'side_delts', null, 'cable', 'isolation'),
  ('Dumbbell Front Raise', 'Raise dumbbells forward to shoulder height.', 'front_delts', null, 'dumbbell', 'isolation'),
  ('Reverse Pec Deck', 'Reverse fly on the pec deck machine.', 'rear_delts', 'upper_back', 'machine', 'isolation'),
  ('Face Pull', 'Pull a rope towards the face with elbows high and external rotation.', 'rear_delts', 'upper_back,traps', 'cable', 'isolation'),
  ('Upright Row', 'Pull a bar or cable vertically to lower-chest height.', 'side_delts', 'traps,biceps', 'ez_bar', 'compound'),

  -- Biceps
  ('Barbell Curl', 'Standing curl with a straight barbell.', 'biceps', 'forearms', 'barbell', 'isolation'),
  ('EZ-Bar Curl', 'Curl with an EZ bar for a semi-supinated grip.', 'biceps', 'forearms', 'ez_bar', 'isolation'),
  ('Dumbbell Curl', 'Alternating or simultaneous dumbbell curls.', 'biceps', 'forearms', 'dumbbell', 'isolation'),
  ('Hammer Curl', 'Neutral-grip dumbbell curl.', 'biceps', 'forearms', 'dumbbell', 'isolation'),
  ('Incline Dumbbell Curl', 'Curl on an incline bench with arms behind the torso.', 'biceps', null, 'dumbbell', 'isolation'),
  ('Preacher Curl', 'Curl over a preacher pad to limit momentum.', 'biceps', null, 'ez_bar', 'isolation'),
  ('Cable Curl', 'Curl from a low pulley with constant tension.', 'biceps', 'forearms', 'cable', 'isolation'),

  -- Triceps
  ('Close-Grip Bench Press', 'Bench press with a shoulder-width grip to emphasise triceps.', 'triceps', 'chest,front_delts', 'barbell', 'compound'),
  ('Triceps Dip', 'Upright parallel-bar dip focused on the triceps.', 'triceps', 'chest,front_delts', 'bodyweight', 'compound'),
  ('Triceps Pushdown', 'Push a bar or rope down from a high pulley.', 'triceps', null, 'cable', 'isolation'),
  ('Overhead Cable Triceps Extension', 'Extend a rope overhead facing away from the pulley.', 'triceps', null, 'cable', 'isolation'),
  ('Skull Crusher', 'Lying extension lowering an EZ bar towards the forehead.', 'triceps', null, 'ez_bar', 'isolation'),
  ('Overhead Dumbbell Extension', 'Seated or standing extension with one dumbbell overhead.', 'triceps', null, 'dumbbell', 'isolation'),

  -- Legs
  ('Back Squat', 'Barbell on the upper back, squat to depth and stand up.', 'quadriceps', 'glutes,adductors,lower_back', 'barbell', 'compound'),
  ('Front Squat', 'Squat with the bar in the front rack position.', 'quadriceps', 'glutes,abs,upper_back', 'barbell', 'compound'),
  ('Leg Press', 'Press the sled away on a 45° leg press.', 'quadriceps', 'glutes,adductors', 'machine', 'compound'),
  ('Hack Squat', 'Machine squat on an angled sled.', 'quadriceps', 'glutes', 'machine', 'compound'),
  ('Bulgarian Split Squat', 'Rear-foot-elevated split squat.', 'quadriceps', 'glutes,adductors', 'dumbbell', 'compound'),
  ('Walking Lunge', 'Alternating forward lunges while travelling.', 'quadriceps', 'glutes,hamstrings', 'dumbbell', 'compound'),
  ('Leg Extension', 'Seated knee extension machine.', 'quadriceps', null, 'machine', 'isolation'),
  ('Romanian Deadlift', 'Hip hinge with soft knees, lowering the bar along the legs.', 'hamstrings', 'glutes,lower_back', 'barbell', 'compound'),
  ('Lying Leg Curl', 'Prone knee flexion on a machine.', 'hamstrings', 'calves', 'machine', 'isolation'),
  ('Seated Leg Curl', 'Seated knee flexion on a machine.', 'hamstrings', null, 'machine', 'isolation'),
  ('Barbell Hip Thrust', 'Shoulders on a bench, drive the hips up against a barbell.', 'glutes', 'hamstrings', 'barbell', 'compound'),
  ('Hip Adduction Machine', 'Seated machine bringing the knees together.', 'adductors', null, 'machine', 'isolation'),
  ('Standing Calf Raise', 'Rise onto the toes under load with straight knees.', 'calves', null, 'machine', 'isolation'),
  ('Seated Calf Raise', 'Calf raise with bent knees to bias the soleus.', 'calves', null, 'machine', 'isolation'),

  -- Core
  ('Plank', 'Hold a straight-body position on forearms and toes. Log seconds as reps.', 'abs', 'obliques', 'bodyweight', 'isolation'),
  ('Hanging Leg Raise', 'Hang from a bar and raise the legs to hip height or higher.', 'abs', 'obliques', 'bodyweight', 'isolation'),
  ('Cable Crunch', 'Kneeling crunch against a high-pulley rope.', 'abs', null, 'cable', 'isolation'),
  ('Ab Wheel Rollout', 'Roll the wheel forward from the knees and return under control.', 'abs', 'lats', 'other', 'isolation'),
  ('Russian Twist', 'Seated torso rotation, optionally holding a weight.', 'obliques', 'abs', 'bodyweight', 'isolation'),
  ('Pallof Press', 'Anti-rotation press away from a side cable.', 'obliques', 'abs', 'cable', 'isolation')
),
inserted as (
  insert into public.exercises (name, description, primary_muscle_group_id, equipment, category)
  select s.name, s.description, mg.id, s.equipment, s.category
  from seed s
  join public.muscle_groups mg on mg.slug = s.primary_slug
  returning id, name
)
insert into public.exercise_secondary_muscles (exercise_id, muscle_group_id)
select i.id, mg.id
from inserted i
join seed s on s.name = i.name
cross join lateral unnest(string_to_array(s.secondary_slugs, ',')) as secondary(slug)
join public.muscle_groups mg on mg.slug = secondary.slug;
