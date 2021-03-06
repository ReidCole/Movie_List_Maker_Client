import styles from "./List.module.css";
import ListingButton from "../ListingButton/ListingButton";
import {
  MinusCircleFilled,
  DeleteOutlined,
  SaveOutlined,
  EditOutlined,
  UndoOutlined,
  LinkOutlined,
  CheckOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import Listing from "../Listing/Listing";
import Container from "../Container/Container";
import { DragEvent, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { ListingType, ListType } from "../ListPage/ListPage";
import Button from "../Button/Button";
import { AuthContext } from "../../context/AuthContext";
import Modal from "../Modal/Modal";
import Loading from "../Loading/Loading";
import useNotificationState from "../../hooks/useNotificationState";
import Notification from "../Notification/Notification";

type Props = {
  listName: string;
  setListName(val: string): void;
  listDescription: string;
  setListDescription(val: string): void;
  listings: ListingType[];
  setListings(listings: ListingType[]): void;
  onRemoveFromList(listing: ListingType): void;
  listId: string;
  ownerUsername: string;
  listEdited: boolean;
  onRevertChanges(): void;
  onSaved(): void;
  listLocation: "localStorage" | "server";
};

const List: React.FC<Props> = ({
  listName,
  setListName,
  listDescription,
  setListDescription,
  listings,
  setListings,
  listId,
  ownerUsername,
  onRemoveFromList,
  listEdited,
  onRevertChanges,
  onSaved,
  listLocation,
}) => {
  const router = useRouter();
  const [editingList, setEditingList] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const auth = useContext(AuthContext);
  const [listingBeingReordered, setListingBeingReordered] = useState<ListingType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationState, showNotification] = useNotificationState();

  useEffect(() => {
    if (listLocation === "localStorage") {
      setCanEdit(true);
      return;
    }

    if (auth === null) return;

    const isOwner = auth.username === ownerUsername;
    setCanEdit(isOwner);
  }, [auth, listLocation, ownerUsername]);

  function saveList() {
    if (auth === null) return;

    console.log("save list", listId);
    if (listLocation === "server") {
      setIsLoading(true);
      const data = {
        listName: listName,
        listDescription: listDescription,
        listings: listings,
      };
      axios
        .patch(`${process.env.NEXT_PUBLIC_SERVER_HOST}/updatelist/${listId}`, data, {
          headers: {
            Authorization: "Bearer " + auth.accessToken,
          },
        })
        .then(() => {
          console.log("list saved successfully");
          setIsLoading(false);
          onSaved();
        })
        .catch((e) => {
          console.error("error saving list", e);
          if (e.request) {
            if (e.request.status === 403) {
              showNotification(
                "Invalid authorization token. Sign in again before performing this action.",
                "red"
              );
            } else if (e.request.status === 401) {
              showNotification("Please sign in to an account to perform this action.", "red");
            }
          }
          setIsLoading(false);
        });
    } else {
      const listToSave: ListType = {
        listName: listName,
        listDescription: listDescription,
        listings: listings,
        listId: listId,
        ownerUsername: "localstorage",
      };
      const currentListsString = localStorage.getItem("lists");
      if (currentListsString === null) {
        const newListsString = JSON.stringify([listToSave]);
        localStorage.setItem("lists", newListsString);
      } else {
        let currentLists = JSON.parse(currentListsString);
        const index = currentLists.findIndex(
          (l: { listId: string | undefined }) => l.listId === listToSave.listId
        );
        // if list already exists in local storage
        if (index !== -1) {
          currentLists[index] = listToSave;
        } else {
          currentLists.push(listToSave);
        }

        const newListsString = JSON.stringify(currentLists);
        localStorage.setItem("lists", newListsString);
        onSaved();
      }
    }
  }

  function deleteList() {
    if (auth === null) return;

    setIsLoading(true);
    console.log("delete list");
    if (listLocation === "server") {
      axios
        .delete(`${process.env.NEXT_PUBLIC_SERVER_HOST}/deletelist/${listId}`, {
          headers: {
            Authorization: "Bearer " + auth.accessToken,
          },
        })
        .then(() => {
          console.log("deleted successfully");
          router.push("/");
        })
        .catch((e) => {
          console.error(e);
          showNotification("Failed to delete list. Please try again later.");
          setIsLoading(false);
        });
    } else {
      const currentListsString = localStorage.getItem("lists");
      if (currentListsString === null) {
        console.error("Tried to delete list but lists item in local storage is null");
        router.push("/");
        return;
      }
      let currentLists = JSON.parse(currentListsString);
      currentLists = currentLists.filter((list: { listId: string }) => list.listId !== listId);
      const newListsString = JSON.stringify(currentLists);
      localStorage.setItem("lists", newListsString);
      router.push("/");
    }
  }

  function onDropListing(e: DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    const draggedItemString = e.dataTransfer.getData("listing");
    if (draggedItemString === "") return;
    const draggedItem: ListingType = JSON.parse(draggedItemString);
    const prevIndex = listings.findIndex((i) => i.idWithinList === draggedItem.idWithinList);
    let listWithoutPrev = listings.slice();
    listWithoutPrev.splice(prevIndex, 1);
    const newIndex = index;
    const firstHalf = listWithoutPrev.slice(0, newIndex);
    const secondHalf = listWithoutPrev.slice(newIndex, listWithoutPrev.length);
    const finalList = [...firstHalf, draggedItem, ...secondHalf];
    setListings(finalList);
  }

  function swapListings(a: number, b: number) {
    if (a < 0 || b < 0 || a === listings.length || b === listings.length) return;
    let newListings = listings.slice();
    const temp = newListings[a];
    newListings[a] = newListings[b];
    newListings[b] = temp;
    setListings(newListings);
  }

  return (
    <>
      <Container
        header={
          <div className={styles.header}>
            <div className={styles.detailsSection}>
              {editingList ? (
                <>
                  <input
                    className={styles.editTitle}
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                  />
                  <textarea
                    className={styles.editDescription}
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                    rows={4}
                    placeholder="Description..."
                  />
                  <Button onClick={() => setEditingList(false)} disabled={listName.length === 0}>
                    <CheckOutlined /> Finish Editing
                  </Button>
                </>
              ) : (
                <>
                  <h1 className={styles.listTitle}>{listName}</h1>
                  {listDescription.length > 0 && (
                    <p className={styles.listDescription}>{listDescription}</p>
                  )}
                  <p className={styles.listOwner}>Created by {ownerUsername}</p>
                </>
              )}
            </div>

            {canEdit && (
              <>
                <div className={styles.buttonSection}>
                  <Button onClick={saveList} disabled={!listEdited || editingList}>
                    <SaveOutlined /> Save
                  </Button>
                  <Button onClick={() => setEditingList(true)} disabled={editingList}>
                    <EditOutlined /> Edit Details
                  </Button>
                  <Button onClick={onRevertChanges} disabled={!listEdited || editingList}>
                    <UndoOutlined /> Undo Changes
                  </Button>
                  {listLocation === "server" && (
                    <Button
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        navigator.clipboard.writeText(window.location.href);
                      }}
                    >
                      <LinkOutlined /> Copy Link
                    </Button>
                  )}

                  <Button onClick={() => setIsModalOpen(true)}>
                    <DeleteOutlined /> Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        }
        body={
          <div className={styles.list}>
            {listings.map((listing, index) => (
              <Listing
                key={listing.idWithinList}
                listing={listing}
                buttons={
                  canEdit
                    ? [
                        <ListingButton
                          key={0}
                          Icon={ArrowUpOutlined}
                          mouseOverText="Remove From List"
                          onClick={() => swapListings(index, index - 1)}
                          disabled={index === 0}
                        />,
                        <ListingButton
                          key={1}
                          Icon={MinusCircleFilled}
                          mouseOverText="Remove From List"
                          onClick={() => onRemoveFromList(listing)}
                        />,
                        <ListingButton
                          key={2}
                          Icon={ArrowDownOutlined}
                          mouseOverText="Remove From List"
                          onClick={() => swapListings(index, index + 1)}
                          disabled={index === listings.length - 1}
                        />,
                      ]
                    : []
                }
                canReorder={listLocation === "localStorage" || auth?.username !== null}
                onDragStart={(e) => {
                  const draggedItemString = JSON.stringify(listing);
                  e.dataTransfer.setData("listing", draggedItemString);
                  setListingBeingReordered(listing);
                }}
                onDragOver={(e) => {
                  if (
                    listingBeingReordered &&
                    listingBeingReordered.idWithinList !== listing.idWithinList
                  ) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => onDropListing(e, index)}
              />
            ))}
          </div>
        }
      />

      <Modal isVisible={isModalOpen} setIsVisible={setIsModalOpen}>
        <div className={styles.modal}>
          <p>Are you sure you want to delete this list?</p>
          <div className={styles.modalButtons}>
            <Button className={styles.modalButton} onClick={() => setIsModalOpen(false)}>
              <ArrowLeftOutlined /> Cancel
            </Button>
            <Button className={styles.modalButton} onClick={() => deleteList()}>
              <DeleteOutlined /> Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Loading isVisible={isLoading} />

      <Notification state={notificationState} />
    </>
  );
};

export default List;
