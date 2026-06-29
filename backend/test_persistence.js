// using native fetch

async function testPersistence() {
  const userId = 'test_user_123';
  const payload = {
    role: 'Student',
    weeklySchedule: {
      Monday: [
        {
          id: '123',
          start: '08:00',
          end: '11:00',
          activity: 'Java',
          category: 'Education'
        }
      ],
      Tuesday: []
    }
  };

  console.log('--- SAVING ---');
  const res = await fetch(`http://localhost:5000/api/profile/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Save response:', data);

  console.log('--- FETCHING ---');
  const res2 = await fetch(`http://localhost:5000/api/profile/${userId}`);
  const data2 = await res2.json();
  console.log('Fetch response weeklySchedule:', JSON.stringify(data2.profile.weeklySchedule, null, 2));
}

testPersistence();
