use super::{AppData, AppStore, StoreError};
use std::{fs, path::PathBuf, sync::{Arc, Barrier}, time::{SystemTime, UNIX_EPOCH}};

fn temporary_root(name: &str) -> PathBuf {
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    std::env::temp_dir().join(format!("absurd-store-{name}-{}-{nonce}", std::process::id()))
}

fn initialized() -> AppData {
    AppData { schema_version: 2, ..AppData::default() }
}

fn cleanup(root: &PathBuf) {
    let state = root.join("state.json");
    if state.exists() { fs::remove_file(state).unwrap(); }
    let assets = root.join("assets");
    if assets.exists() { fs::remove_dir(assets).unwrap(); }
    if root.exists() { fs::remove_dir(root).unwrap(); }
}

#[test]
fn rejects_a_stale_revision() {
    let root = temporary_root("revision");
    let store = AppStore::open(root.clone()).unwrap();
    let saved = store.save(initialized(), 0).unwrap();
    assert_eq!(saved.revision, 1);
    let result = store.save(initialized(), 0);
    assert!(matches!(result, Err(StoreError::StateConflict { latest }) if latest.revision == 1));
    drop(store);
    cleanup(&root);
}

#[test]
fn claims_only_one_card_per_day() {
    let root = temporary_root("daily-card");
    let store = Arc::new(AppStore::open(root.clone()).unwrap());
    store.save(initialized(), 0).unwrap();
    let barrier = Arc::new(Barrier::new(2));
    let handles: Vec<_> = (0..2).map(|index| {
        let store = Arc::clone(&store);
        let barrier = Arc::clone(&barrier);
        std::thread::spawn(move || {
            let card = serde_json::json!({
                "id": format!("card-{index}"), "earnedAt": "2026-09-10T08:00:00Z"
            });
            barrier.wait();
            store.claim_card("2026-09-10", card)
        })
    }).collect();
    let results: Vec<_> = handles.into_iter().map(|handle| handle.join().unwrap()).collect();
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert_eq!(results.iter().filter(|result|
        matches!(result, Err(StoreError::DailyCardExists))).count(), 1);
    assert_eq!(store.load().unwrap().cards.len(), 1);
    drop(store);
    cleanup(&root);
}
