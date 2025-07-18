public class CaseUpdateHandler {
    public static void updateCases(List<Case> cases) {
        for (Case c : cases) {
            // VIOLATION: SOQL query inside a loop
            Id partnerEscalationQueueId = [SELECT Id FROM Group WHERE Type='Queue' AND Name = 'Partner Escalation Queue' LIMIT 1].Id;
            
            // VIOLATION: DML operation inside a loop
            if (c.AccountId != null) {
                Account acc = [SELECT Type FROM Account WHERE Id = :c.AccountId];
                if (acc.Type == 'Partner') {
                    c.OwnerId = partnerEscalationQueueId;
                    c.Status = 'Escalated';
                    c.IsEscalated = true;
                    update c;
                }
            }

            // VIOLATION: Hardcoded ID
            if (c.Origin == 'Community') {
                c.OwnerId = '00G000000000001AAA';
            }

            // VIOLATION: Empty catch block
            try {
                String s = c.Subject.substring(0, 10);
            } catch (Exception e) {}

            // VIOLATION: Unnecessary if statement
            if (true) {
                c.Description = 'Updated: ' + c.Description;
            }
        }
    }

    // VIOLATION: Unused method
    private static void unusedMethod() {
        System.debug('This method is never called');
    }
}