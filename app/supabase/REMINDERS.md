# Turning on phone reminders

Once, about 15 minutes. Reminders arrive at 9 am for each fixed date, by its own "Remind me" choice.

## 1. Add the reminder function to Supabase
1. Open your project at supabase.com, then **Edge Functions** in the left menu.
2. Choose **Deploy a new function**, then **Via Editor**.
3. Name it exactly `remind`.
4. Delete the sample code, paste everything from `supabase/remind/index.ts`, and click **Deploy**.

## 2. Run the setup SQL
1. **SQL Editor**, then **New query**.
2. Paste everything from `supabase/reminders.sql` and click **Run**. It makes the tables and runs the function every hour.

## 3. Turn them on on the phone
1. On the iPhone, open the notebook in Safari, tap **Share**, then **Add to Home Screen**. Reminders only work in the Home Screen app.
2. Open the notebook from the Home Screen and sign in.
3. Go to **Days** and tap **Turn on reminders**, then **Allow**. A test notification should show up right away.

If the test doesn't come, open **Edge Functions → remind → Logs** in Supabase to see what went wrong.
