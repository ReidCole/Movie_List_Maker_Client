import { MinusCircleFilled } from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/router";
import { useState } from "react";
import { ListingType, ListType } from "../../pages/list/[id]";
import Container from "../Container/Container";
import Listing from "../Listing/Listing";
import ListingButton from "../ListingButton/ListingButton";
import styles from "./NewList.module.css";

type Props = {
  listName: string;
  setListName(val: string): void;
  listDescription: string;
  setListDescription(val: string): void;
  listings: ListingType[];
  setListings(val: ListingType[]): void;
  onRemoveFromList(listing: ListingType): void;
};

const NewList: React.FC<Props> = ({
  listName,
  setListName,
  listDescription,
  setListDescription,
  listings,
  setListings,
  onRemoveFromList,
}) => {
  const router = useRouter();

  function saveToAccount() {
    if (listings.length === 0) {
      console.error("list must have at least one movie or tv show");
      return;
    }
    if (listName.length === 0) {
      console.error("list name must not be blank");
    }

    const newList: ListType = {
      listName: listName,
      listDescription: listDescription,
      ownerUserId: "test",
      listings: listings,
    };
    axios
      .post("http://localhost:4000/savelist", newList)
      .then((res) => router.push(`/list/${res.data}`));
  }

  return (
    <Container
      header={
        <>
          <h2 className={styles.heading}>New List</h2>
          <div>
            <label className={styles.listNameLabel}>
              <p>List Name</p>
              <input type="text" value={listName} onChange={(e) => setListName(e.target.value)} />
            </label>
            <label className={styles.listNameLabel}>
              <p>Description</p>
              <textarea
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                rows={4}
              />
            </label>
          </div>
          <button onClick={saveToAccount}>Save to Account (works)</button>
          <p>(only enable save button if the list has changed)</p>
          <button>Save to Local Storage (todo)</button>
          <button onClick={() => setListings([])}>Reset (works)</button>
        </>
      }
      body={
        listings.length > 0 ? (
          <div className={styles.list}>
            {listings.map((listing) => (
              <Listing
                key={listing.idWithinList}
                listing={listing}
                buttons={[
                  <ListingButton
                    key={0}
                    Icon={MinusCircleFilled}
                    mouseOverText="Remove From List"
                    onClick={() => onRemoveFromList(listing)}
                  />,
                ]}
              />
            ))}
          </div>
        ) : (
          <p className={styles.emptyListText}>Movies and shows in your list will appear here</p>
        )
      }
    />
  );
};

export default NewList;
