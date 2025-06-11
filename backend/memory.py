class MemoryStore:
    def __init__(self):
        self.store = {}

    def _get_key(self, user_id, industry,  plant_name):
        return f"{user_id}:{industry}:{plant_name}"

    def get_history(self, user_id, industry,  plant_name):
        key = self._get_key(user_id, industry,  plant_name)
        return self.store.get(key, "")

    def add_entry(self, user_id, industry,  plant_name, question, answer):
        key = self._get_key(user_id, industry, plant_name)
        history = self.store.get(key, "")
        new_entry = f"Q: {question}\nA: {answer}\n\n"
        self.store[key] = history + new_entry